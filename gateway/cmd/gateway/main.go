package main

import (
	"context"
	"errors"
	"github.com/golang-jwt/jwt/v5"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"syscall"
	"time"

	"ticket-platform/gateway/internal/auth"
	"ticket-platform/gateway/internal/authz"
	"ticket-platform/gateway/internal/middleware"
	"ticket-platform/gateway/internal/opa"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	target, err := url.Parse(getenv("SERVER_URL", "http://localhost:3000"))
	if err != nil {
		logger.Error("invalid SERVER_URL", "err", err)
		os.Exit(1)
	}

	pemBytes, err := os.ReadFile(getenv("JWT_PUBLIC_KEY", "dev-keys/public.pem"))
	if err != nil {
		logger.Error("cannot read public key", "err", err)
		os.Exit(1)
	}
	publicKey, err := jwt.ParseRSAPublicKeyFromPEM(pemBytes)
	if err != nil {
		logger.Error("invalid public key", "err", err)
		os.Exit(1)
	}
	verifier := auth.NewVerifier(
		publicKey,
		getenv("JWT_ISSUER", "ticket-devtoken"),
		getenv("JWT_AUDIENCE", "ticket-platform"),
	)

	proxy := &httputil.ReverseProxy{
		Rewrite: func(r *httputil.ProxyRequest) {
			r.SetURL(target)
			r.SetXForwarded()
			r.Out.Header.Set(middleware.RequestIDHeader, middleware.RequestIDFrom(r.In.Context()))
		},
		ErrorLog: slog.NewLogLogger(logger.Handler(), slog.LevelError),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok\n"))
	})
	guard := authz.Guard{
		Decider: opa.New(getenv("OPA_URL", "http://localhost:8181"), 500*time.Millisecond),
		Logger:  logger,
	}
	authenticate := auth.Authenticate(verifier)

	routes := map[string]string{
		"POST /tickets":              "ticket:open",
		"GET /tickets/{id}":          "ticket:read",
		"POST /tickets/{id}/submit":  "ticket:submit",
		"POST /tickets/{id}/approve": "ticket:approve",
		"POST /tickets/{id}/reject":  "ticket:reject",
	}
	for pattern, action := range routes {
		mux.Handle(pattern, authenticate(guard.Require(action)(proxy)))
	}
	handler := middleware.RequestID(middleware.Logging(logger)(mux))

	srv := &http.Server{
		Addr:              getenv("GATEWAY_ADDR", "localhost:8080"),
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		logger.Info("gateway listening", "addr", srv.Addr, "target", target.String())
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("server error", "err", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	logger.Info("shutting down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("shutdown error", "err", err)
	}
	logger.Info("stopped")
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
