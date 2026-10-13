package auth

import (
	"context"
	"crypto/rsa"
	"errors"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// Claims is the shape of our tokens. devtoken signs it, the gateway verifies it.
type Claims struct {
	Roles []string `json:"roles"`
	jwt.RegisteredClaims
}

// Identity is what the rest of the gateway learns about the caller.
type Identity struct {
	Subject string
	Roles   []string
}

type Verifier struct {
	key    *rsa.PublicKey
	parser *jwt.Parser
}

func NewVerifier(key *rsa.PublicKey, issuer, audience string) *Verifier {
	return &Verifier{
		key: key,
		parser: jwt.NewParser(
			jwt.WithValidMethods([]string{"RS256"}),
			jwt.WithIssuer(issuer),
			jwt.WithAudience(audience),
			jwt.WithExpirationRequired(),
		),
	}
}

func (v *Verifier) Verify(token string) (Identity, error) {
	var c Claims
	_, err := v.parser.ParseWithClaims(token, &c, func(*jwt.Token) (any, error) {
		return v.key, nil
	})
	if err != nil {
		return Identity{}, err
	}
	if c.Subject == "" {
		return Identity{}, errors.New("token has no subject")
	}
	return Identity{Subject: c.Subject, Roles: c.Roles}, nil
}

type ctxKey struct{}

// Authenticate rejects requests without a valid bearer token with 401.
func Authenticate(v *Verifier) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
			if !ok || token == "" {
				unauthorized(w)
				return
			}
			id, err := v.Verify(token)
			if err != nil {
				unauthorized(w)
				return
			}
			next.ServeHTTP(w, r.WithContext(WithIdentity(r.Context(), id)))
		})
	}
}

// IdentityFrom returns the identity stored by Authenticate.
func IdentityFrom(ctx context.Context) (Identity, bool) {
	id, ok := ctx.Value(ctxKey{}).(Identity)
	return id, ok
}

func unauthorized(w http.ResponseWriter) {
	w.Header().Set("WWW-Authenticate", "Bearer")
	http.Error(w, "unauthorized", http.StatusUnauthorized)
}

// WithIdentity stores id in ctx. Authenticate uses it; tests use it to stand in for a caller.
func WithIdentity(ctx context.Context, id Identity) context.Context {
	return context.WithValue(ctx, ctxKey{}, id)
}
