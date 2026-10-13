package opa

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"
)

const routeAllowedPath = "/v1/data/ticket/authz/route_allowed"

// Client asks OPA for decisions over its REST API.
type Client struct {
	baseURL string
	timeout time.Duration
	http    *http.Client
}

func New(baseURL string, timeout time.Duration) *Client {
	return &Client{baseURL: baseURL, timeout: timeout, http: &http.Client{}}
}

type subject struct {
	ID    string   `json:"id"`
	Roles []string `json:"roles"`
}

type routeInput struct {
	Subject subject `json:"subject"`
	Action  string  `json:"action"`
}

// RouteAllowed asks the route_allowed decision. Any error means "no answer", never "allowed".
func (c *Client) RouteAllowed(ctx context.Context, subjectID string, roles []string, action string) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	body, err := json.Marshal(map[string]routeInput{
		"input": {Subject: subject{ID: subjectID, Roles: roles}, Action: action},
	})
	if err != nil {
		return false, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+routeAllowedPath, bytes.NewReader(body))
	if err != nil {
		return false, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("opa: unexpected status %d", resp.StatusCode)
	}

	var out struct {
		Result *bool `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return false, fmt.Errorf("opa: decode response: %w", err)
	}
	if out.Result == nil {
		return false, errors.New("opa: decision is undefined")
	}
	return *out.Result, nil
}
