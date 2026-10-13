package middleware

import (
	"context"
	"crypto/rand"
	"net/http"
)

const RequestIDHeader = "X-Request-Id"

type ctxKey struct{}

// RequestID gives every request a new ID. A value sent by the client is never used.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := rand.Text()
		w.Header().Set(RequestIDHeader, id)
		ctx := context.WithValue(r.Context(), ctxKey{}, id)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequestIDFrom returns the ID stored by RequestID, or "" if there is none.
func RequestIDFrom(ctx context.Context) string {
	id, _ := ctx.Value(ctxKey{}).(string)
	return id
}
