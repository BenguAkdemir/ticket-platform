package proxy

import (
	"log"
	"net/http/httputil"
	"net/url"
	"strings"

	"ticket-platform/gateway/internal/auth"
	"ticket-platform/gateway/internal/middleware"
)

const (
	UserIDHeader    = "X-User-Id"
	UserRolesHeader = "X-User-Roles"
)

// New returns a reverse proxy to target. Identity headers on the outbound
// request come only from the verified token, never from the client.
func New(target *url.URL, errorLog *log.Logger) *httputil.ReverseProxy {
	return &httputil.ReverseProxy{
		Rewrite: func(r *httputil.ProxyRequest) {
			r.SetURL(target)
			r.SetXForwarded()
			r.Out.Header.Set(middleware.RequestIDHeader, middleware.RequestIDFrom(r.In.Context()))

			// Remove first: if anything below fails, the server sees no identity, not a forged one.
			r.Out.Header.Del(UserIDHeader)
			r.Out.Header.Del(UserRolesHeader)
			r.Out.Header.Del("Authorization")

			if id, ok := auth.IdentityFrom(r.In.Context()); ok {
				r.Out.Header.Set(UserIDHeader, id.Subject)
				r.Out.Header.Set(UserRolesHeader, strings.Join(id.Roles, ","))
			}
		},
		ErrorLog: errorLog,
	}
}
