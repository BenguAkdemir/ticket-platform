package authz

import (
	"context"
	"log/slog"
	"net/http"

	"ticket-platform/gateway/internal/auth"
	"ticket-platform/gateway/internal/middleware"
)

// Decider answers "may these roles perform this action at all?". The OPA client implements it.
type Decider interface {
	RouteAllowed(ctx context.Context, subject string, roles []string, action string) (bool, error)
}

type Guard struct {
	Decider Decider
	Logger  *slog.Logger
}

// Require lets a request through only if the decider allows action for the caller.
// It must run after auth.Authenticate.
func (g Guard) Require(action string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			reqID := middleware.RequestIDFrom(r.Context())

			id, ok := auth.IdentityFrom(r.Context())
			if !ok {
				g.Logger.Error("authorization without identity", "request_id", reqID)
				http.Error(w, "internal error", http.StatusInternalServerError)
				return
			}

			allowed, err := g.Decider.RouteAllowed(r.Context(), id.Subject, id.Roles, action)
			if err != nil {
				g.Logger.Error("authorization unavailable", "request_id", reqID, "err", err)
				http.Error(w, "service unavailable", http.StatusServiceUnavailable)
				return
			}
			if !allowed {
				http.Error(w, "forbidden", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
