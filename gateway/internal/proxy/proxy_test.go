package proxy

import (
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"ticket-platform/gateway/internal/auth"
	"ticket-platform/gateway/internal/middleware"
)

// backend starts a fake server and records the headers it receives.
func backend(t *testing.T) (*url.URL, *http.Header) {
	t.Helper()
	var got http.Header
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = r.Header.Clone()
	}))
	t.Cleanup(srv.Close)
	target, err := url.Parse(srv.URL)
	if err != nil {
		t.Fatal(err)
	}
	return target, &got
}

func newProxy(target *url.URL) http.Handler {
	return New(target, log.New(io.Discard, "", 0))
}

func TestClientIdentityHeadersAreReplacedByToken(t *testing.T) {
	target, got := backend(t)

	req := httptest.NewRequest(http.MethodPost, "/tickets", nil)
	req.Header.Set(UserIDHeader, "u2")
	req.Header.Set(UserRolesHeader, "reviewer")
	req = req.WithContext(auth.WithIdentity(req.Context(), auth.Identity{Subject: "u1", Roles: []string{"requester"}}))

	newProxy(target).ServeHTTP(httptest.NewRecorder(), req)

	if v := got.Values(UserIDHeader); len(v) != 1 || v[0] != "u1" {
		t.Fatalf("%s = %v, want [u1]", UserIDHeader, v)
	}
	if v := got.Get(UserRolesHeader); v != "requester" {
		t.Fatalf("%s = %q, want %q", UserRolesHeader, v, "requester")
	}
}

func TestMultipleRolesAreCommaSeparated(t *testing.T) {
	target, got := backend(t)

	req := httptest.NewRequest(http.MethodGet, "/tickets/1", nil)
	req = req.WithContext(auth.WithIdentity(req.Context(), auth.Identity{Subject: "u1", Roles: []string{"requester", "reviewer"}}))

	newProxy(target).ServeHTTP(httptest.NewRecorder(), req)

	if v := got.Get(UserRolesHeader); v != "requester,reviewer" {
		t.Fatalf("%s = %q", UserRolesHeader, v)
	}
}

func TestClientIdentityHeadersAreDroppedWithoutIdentity(t *testing.T) {
	target, got := backend(t)

	req := httptest.NewRequest(http.MethodGet, "/tickets/1", nil)
	req.Header.Set(UserIDHeader, "admin")
	req.Header.Set(UserRolesHeader, "reviewer")

	newProxy(target).ServeHTTP(httptest.NewRecorder(), req)

	if v := got.Get(UserIDHeader); v != "" {
		t.Fatalf("%s reached the server as %q", UserIDHeader, v)
	}
	if v := got.Get(UserRolesHeader); v != "" {
		t.Fatalf("%s reached the server as %q", UserRolesHeader, v)
	}
}

func TestAuthorizationHeaderIsNotForwarded(t *testing.T) {
	target, got := backend(t)

	req := httptest.NewRequest(http.MethodGet, "/tickets/1", nil)
	req.Header.Set("Authorization", "Bearer some-token")
	req = req.WithContext(auth.WithIdentity(req.Context(), auth.Identity{Subject: "u1"}))

	newProxy(target).ServeHTTP(httptest.NewRecorder(), req)

	if v := got.Get("Authorization"); v != "" {
		t.Fatalf("Authorization reached the server as %q", v)
	}
}

func TestRequestIDIsForwarded(t *testing.T) {
	target, got := backend(t)
	rec := httptest.NewRecorder()

	middleware.RequestID(newProxy(target)).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/tickets/1", nil))

	sent := rec.Header().Get(middleware.RequestIDHeader)
	if sent == "" || got.Get(middleware.RequestIDHeader) != sent {
		t.Fatalf("server got %q, client got %q", got.Get(middleware.RequestIDHeader), sent)
	}
}
