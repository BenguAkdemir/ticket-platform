package middleware

import (
	"bytes"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func captureID(dst *string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		*dst = RequestIDFrom(r.Context())
	})
}

func TestRequestIDReachesNextHandlerAndResponse(t *testing.T) {
	var seen string
	rec := httptest.NewRecorder()

	RequestID(captureID(&seen)).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/tickets", nil))

	if seen == "" {
		t.Fatal("request ID missing from context")
	}
	if got := rec.Header().Get(RequestIDHeader); got != seen {
		t.Fatalf("response header = %q, context = %q", got, seen)
	}
}

func TestRequestIDIgnoresClientValue(t *testing.T) {
	var seen string
	req := httptest.NewRequest(http.MethodGet, "/tickets", nil)
	req.Header.Set(RequestIDHeader, "client-chosen")

	RequestID(captureID(&seen)).ServeHTTP(httptest.NewRecorder(), req)

	if seen == "client-chosen" {
		t.Fatal("client-supplied request ID was trusted")
	}
}

func TestRequestIDIsUniquePerRequest(t *testing.T) {
	var first, second string
	RequestID(captureID(&first)).ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/", nil))
	RequestID(captureID(&second)).ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/", nil))

	if first == second {
		t.Fatalf("two requests got the same ID %q", first)
	}
}

func TestLoggingRecordsStatusWrittenByHandler(t *testing.T) {
	var buf bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&buf, nil))
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	})

	Logging(logger)(next).ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/tickets/x", nil))

	if !strings.Contains(buf.String(), `"status":404`) {
		t.Fatalf("log line does not contain status 404: %s", buf.String())
	}
}

func TestLoggingDefaultsTo200WhenHandlerOnlyWritesBody(t *testing.T) {
	var buf bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&buf, nil))
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})

	Logging(logger)(next).ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/healthz", nil))

	if !strings.Contains(buf.String(), `"status":200`) {
		t.Fatalf("log line does not contain status 200: %s", buf.String())
	}
}
