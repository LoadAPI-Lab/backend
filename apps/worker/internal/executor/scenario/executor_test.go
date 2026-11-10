package scenario

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"worker/internal/config"
	"worker/internal/job"
)

func TestRunNetworkErrorHidesResolvedURL(t *testing.T) {
	allowPrivateNetworks(t)

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	addr := listener.Addr().String()
	listener.Close()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"token":"secret-value"}`))
	}))
	t.Cleanup(server.Close)

	cfg := Config{Steps: []Step{
		{
			Target:  job.Target{Method: "POST", URL: server.URL + "/login"},
			Extract: []ExtractRule{{Name: "token", Path: "token"}},
		},
		{
			Target: job.Target{Method: "GET", URL: "http://" + addr + "/x?token={{token}}"},
		},
	}}

	result := run(t, cfg)

	step := result.Steps[1]
	if step.Status != StepStatusFailed {
		t.Errorf("Status = %s, want %s", step.Status, StepStatusFailed)
	}
	if step.Description != "network error: connection_refused" {
		t.Errorf("Description = %q, want %q", step.Description, "network error: connection_refused")
	}
	assertNotContains(t, result, "secret-value")
}

func TestRunReportsURLTemplate(t *testing.T) {
	allowPrivateNetworks(t)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/login" {
			w.Write([]byte(`{"id":"resolved-id-value"}`))
			return
		}
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(r.URL.Path))
	}))
	t.Cleanup(server.Close)

	template := server.URL + "/items/{{id}}"
	cfg := Config{Steps: []Step{
		{
			Target:  job.Target{Method: "POST", URL: server.URL + "/login"},
			Extract: []ExtractRule{{Name: "id", Path: "id"}},
		},
		{
			Target: job.Target{Method: "GET", URL: template},
		},
	}}

	result := run(t, cfg)

	step := result.Steps[1]
	if step.URL != template {
		t.Errorf("URL = %q, want %q", step.URL, template)
	}
	if step.Status != StepStatusFailed || step.StatusCode != http.StatusNotFound {
		t.Errorf("Status = %s %d, want %s %d", step.Status, step.StatusCode, StepStatusFailed, http.StatusNotFound)
	}
	assertNotContains(t, result, "resolved-id-value")
}

func allowPrivateNetworks(t *testing.T) {
	t.Helper()
	t.Cleanup(func() {
		if err := config.Load(); err != nil {
			t.Error(err)
		}
	})
	t.Setenv("OUTBOUND_ALLOW_PRIVATE_NETWORKS", "true")
	if err := config.Load(); err != nil {
		t.Fatal(err)
	}
}

func run(t *testing.T, cfg Config) Result {
	t.Helper()
	out, err := New("test", cfg).Run(context.Background())
	if err != nil {
		t.Fatalf("Run() error: %v", err)
	}
	return out.(Result)
}

func assertNotContains(t *testing.T, result Result, value string) {
	t.Helper()
	data, err := json.Marshal(result)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(data), value) {
		t.Errorf("result contains %q: %s", value, data)
	}
}
