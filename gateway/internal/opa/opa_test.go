package opa

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
	"io"
)

func fakeOPA(t *testing.T, status int, body string) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(status)
		w.Write([]byte(body))
	}))
	t.Cleanup(srv.Close)
	return srv
}

func TestRouteAllowed(t *testing.T) {
	tests := []struct {
		name    string
		status  int
		body    string
		want    bool
		wantErr bool
	}{
		{"allowed", http.StatusOK, `{"result":true}`, true, false},
		{"denied", http.StatusOK, `{"result":false}`, false, false},
		{"undefined decision", http.StatusOK, `{}`, false, true},
		{"opa returns 500", http.StatusInternalServerError, `{"code":"internal_error"}`, false, true},
		{"body is not json", http.StatusOK, `not json`, false, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			srv := fakeOPA(t, tt.status, tt.body)

			got, err := New(srv.URL, time.Second).RouteAllowed(context.Background(), "u1", []string{"requester"}, "ticket:open")

			if (err != nil) != tt.wantErr {
				t.Fatalf("err = %v, wantErr %v", err, tt.wantErr)
			}
			if got != tt.want {
				t.Fatalf("allowed = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestRouteAllowedSendsInputToDecisionPath(t *testing.T) {
	var path string
	var got struct {
		Input routeInput `json:"input"`
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path = r.URL.Path
		json.NewDecoder(r.Body).Decode(&got)
		w.Write([]byte(`{"result":true}`))
	}))
	defer srv.Close()

	New(srv.URL, time.Second).RouteAllowed(context.Background(), "u2", []string{"reviewer"}, "ticket:approve")

	if path != routeAllowedPath {
		t.Fatalf("path = %q, want %q", path, routeAllowedPath)
	}
	if got.Input.Subject.ID != "u2" || got.Input.Action != "ticket:approve" || got.Input.Subject.Roles[0] != "reviewer" {
		t.Fatalf("input = %+v", got.Input)
	}
}

func TestRouteAllowedTimesOut(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		io.Copy(io.Discard, r.Body)
		select {
		case <-time.After(time.Second):
		case <-r.Context().Done():
		}
	}))
	defer srv.Close()

	start := time.Now()
	_, err := New(srv.URL, 50*time.Millisecond).RouteAllowed(context.Background(), "u1", nil, "ticket:open")

	if err == nil {
		t.Fatal("expected a timeout error")
	}
	if elapsed := time.Since(start); elapsed > 500*time.Millisecond {
		t.Fatalf("waited %v; timeout was not enforced", elapsed)
	}
}

func TestRouteAllowedWhenOPAIsDown(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	url := srv.URL
	srv.Close()

	_, err := New(url, time.Second).RouteAllowed(context.Background(), "u1", nil, "ticket:open")

	if err == nil {
		t.Fatal("expected an error when OPA is unreachable")
	}
}
