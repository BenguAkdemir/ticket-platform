package auth

import (
	"crypto/rand"
	"crypto/rsa"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	testIssuer   = "test-issuer"
	testAudience = "test-audience"
)

func newKey(t *testing.T) *rsa.PrivateKey {
	t.Helper()
	k, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	return k
}

func validClaims() Claims {
	return Claims{
		Roles: []string{"reviewer"},
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   "u2",
			Issuer:    testIssuer,
			Audience:  jwt.ClaimStrings{testAudience},
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Minute)),
		},
	}
}

func sign(t *testing.T, method jwt.SigningMethod, c Claims, key any) string {
	t.Helper()
	s, err := jwt.NewWithClaims(method, c).SignedString(key)
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func TestAuthenticate(t *testing.T) {
	key := newKey(t)
	otherKey := newKey(t)
	v := NewVerifier(&key.PublicKey, testIssuer, testAudience)

	expired := validClaims()
	expired.ExpiresAt = jwt.NewNumericDate(time.Now().Add(-time.Minute))

	noExp := validClaims()
	noExp.ExpiresAt = nil

	wrongIssuer := validClaims()
	wrongIssuer.Issuer = "someone-else"

	wrongAudience := validClaims()
	wrongAudience.Audience = jwt.ClaimStrings{"reporting-service"}

	noSubject := validClaims()
	noSubject.Subject = ""

	tests := []struct {
		name   string
		header string
		want   int
	}{
		{"valid token", "Bearer " + sign(t, jwt.SigningMethodRS256, validClaims(), key), http.StatusOK},
		{"no header", "", http.StatusUnauthorized},
		{"not a bearer token", "Basic dTE6cGFzcw==", http.StatusUnauthorized},
		{"expired", "Bearer " + sign(t, jwt.SigningMethodRS256, expired, key), http.StatusUnauthorized},
		{"no exp claim", "Bearer " + sign(t, jwt.SigningMethodRS256, noExp, key), http.StatusUnauthorized},
		{"signed with HS256", "Bearer " + sign(t, jwt.SigningMethodHS256, validClaims(), []byte("secret")), http.StatusUnauthorized},
		{"signed with another key", "Bearer " + sign(t, jwt.SigningMethodRS256, validClaims(), otherKey), http.StatusUnauthorized},
		{"wrong issuer", "Bearer " + sign(t, jwt.SigningMethodRS256, wrongIssuer, key), http.StatusUnauthorized},
		{"wrong audience", "Bearer " + sign(t, jwt.SigningMethodRS256, wrongAudience, key), http.StatusUnauthorized},
		{"no subject", "Bearer " + sign(t, jwt.SigningMethodRS256, noSubject, key), http.StatusUnauthorized},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			})
			req := httptest.NewRequest(http.MethodGet, "/tickets", nil)
			if tt.header != "" {
				req.Header.Set("Authorization", tt.header)
			}
			rec := httptest.NewRecorder()

			Authenticate(v)(next).ServeHTTP(rec, req)

			if rec.Code != tt.want {
				t.Fatalf("status = %d, want %d", rec.Code, tt.want)
			}
		})
	}
}

func TestAuthenticateStoresIdentity(t *testing.T) {
	key := newKey(t)
	v := NewVerifier(&key.PublicKey, testIssuer, testAudience)

	var got Identity
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got, _ = IdentityFrom(r.Context())
	})
	req := httptest.NewRequest(http.MethodGet, "/tickets", nil)
	req.Header.Set("Authorization", "Bearer "+sign(t, jwt.SigningMethodRS256, validClaims(), key))

	Authenticate(v)(next).ServeHTTP(httptest.NewRecorder(), req)

	if got.Subject != "u2" || len(got.Roles) != 1 || got.Roles[0] != "reviewer" {
		t.Fatalf("identity = %+v", got)
	}
}
