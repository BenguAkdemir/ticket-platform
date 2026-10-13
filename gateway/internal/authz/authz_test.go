package authz

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"ticket-platform/gateway/internal/auth"
)

type fakeDecider struct {
	allowed bool
	err     error
}

func (f fakeDecider) RouteAllowed(ctx context.Context, subject string, roles []string, action string) (bool, error) {
	return f.allowed, f.err
}

func TestRequire(t *testing.T) {
	tests := []struct {
		name         string
		decider      fakeDecider
		withIdentity bool
		want         int
		wantNext     bool
	}{
		{"allowed", fakeDecider{allowed: true}, true, http.StatusOK, true},
		{"denied", fakeDecider{allowed: false}, true, http.StatusForbidden, false},
		{"decider unavailable", fakeDecider{err: errors.New("connection refused")}, true, http.StatusServiceUnavailable, false},
		{"no identity in context", fakeDecider{allowed: true}, false, http.StatusInternalServerError, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			nextCalled := false
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				nextCalled = true
			})

			req := httptest.NewRequest(http.MethodPost, "/tickets/1/approve", nil)
			if tt.withIdentity {
				req = req.WithContext(auth.WithIdentity(req.Context(), auth.Identity{Subject: "u1", Roles: []string{"requester"}}))
			}
			rec := httptest.NewRecorder()
			guard := Guard{Decider: tt.decider, Logger: slog.New(slog.NewTextHandler(io.Discard, nil))}

			guard.Require("ticket:approve")(next).ServeHTTP(rec, req)

			if rec.Code != tt.want {
				t.Fatalf("status = %d, want %d", rec.Code, tt.want)
			}
			if nextCalled != tt.wantNext {
				t.Fatalf("next called = %v, want %v", nextCalled, tt.wantNext)
			}
		})
	}
}
