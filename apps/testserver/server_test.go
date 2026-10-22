package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func newTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	server := httptest.NewServer(newHandler(newTraffic(0, 0)))
	t.Cleanup(server.Close)
	return server
}

func call(t *testing.T, method, url, token, body string) (int, map[string]any) {
	t.Helper()
	req, err := http.NewRequest(method, url, strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	var decoded map[string]any
	json.Unmarshal(raw, &decoded)
	return resp.StatusCode, decoded
}

func TestFixed(t *testing.T) {
	server := newTestServer(t)

	start := time.Now()
	resp, err := http.Get(server.URL + "/fixed?delay=100ms&size=2048")
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()

	if elapsed := time.Since(start); elapsed < 100*time.Millisecond {
		t.Errorf("answered after %v, want at least 100ms", elapsed)
	}
	if resp.StatusCode != http.StatusOK || len(body) != 2048 {
		t.Errorf("got status %d and %d bytes, want 200 and 2048", resp.StatusCode, len(body))
	}

	for _, query := range []string{"delay=abc", "delay=-1s", "delay=2m", "size=-1", "size=abc", "size=2000000"} {
		if status, _ := call(t, http.MethodGet, server.URL+"/fixed?"+query, "", ""); status != http.StatusBadRequest {
			t.Errorf("/fixed?%s: status %d, want 400", query, status)
		}
	}
}

func TestStatusAndFlaky(t *testing.T) {
	server := newTestServer(t)

	tests := []struct {
		path string
		want int
	}{
		{"/status/429", 429},
		{"/status/503", 503},
		{"/status/99", 400},
		{"/status/abc", 400},
		{"/flaky?errorRate=1", 500},
		{"/flaky?errorRate=0", 200},
		{"/flaky?errorRate=2", 400},
	}
	for _, tt := range tests {
		if status, _ := call(t, http.MethodGet, server.URL+tt.path, "", ""); status != tt.want {
			t.Errorf("%s: status %d, want %d", tt.path, status, tt.want)
		}
	}
}

func TestTaskScenario(t *testing.T) {
	server := newTestServer(t)

	status, login := call(t, http.MethodPost, server.URL+"/auth/login", "", `{"email":"a@example.com","password":"x"}`)
	if status != http.StatusOK {
		t.Fatalf("login: status %d", status)
	}
	token := login["accessToken"].(string)

	if status, _ := call(t, http.MethodPost, server.URL+"/tasks", "", `{"title":"t"}`); status != http.StatusUnauthorized {
		t.Errorf("create without token: status %d, want 401", status)
	}

	status, created := call(t, http.MethodPost, server.URL+"/tasks", token, `{"title":"first"}`)
	if status != http.StatusCreated {
		t.Fatalf("create: status %d", status)
	}
	data := created["data"].(map[string]any)
	id := jsonNumber(data["id"])
	if data["status"] != "todo" {
		t.Errorf("default status = %v, want todo", data["status"])
	}

	taskURL := server.URL + "/tasks/" + id
	if status, _ := call(t, http.MethodPatch, taskURL, token, `{"status":"done"}`); status != http.StatusOK {
		t.Errorf("patch: status %d", status)
	}
	if status, _ := call(t, http.MethodPatch, taskURL, token, `{"status":"lost"}`); status != http.StatusBadRequest {
		t.Errorf("patch with invalid status: status %d, want 400", status)
	}
	if status, got := call(t, http.MethodGet, taskURL, token, ""); status != http.StatusOK || got["data"].(map[string]any)["status"] != "done" {
		t.Errorf("get after patch: status %d, body %v", status, got)
	}

	_, other := call(t, http.MethodPost, server.URL+"/auth/login", "", `{"email":"b@example.com","password":"x"}`)
	if status, _ := call(t, http.MethodGet, taskURL, other["accessToken"].(string), ""); status != http.StatusNotFound {
		t.Errorf("someone else's task: status %d, want 404", status)
	}

	if status, _ := call(t, http.MethodDelete, taskURL, token, ""); status != http.StatusNoContent {
		t.Errorf("delete: status %d", status)
	}
	if status, _ := call(t, http.MethodGet, taskURL, token, ""); status != http.StatusNotFound {
		t.Errorf("get after delete: status %d, want 404", status)
	}
}

func TestUsersConflict(t *testing.T) {
	server := newTestServer(t)

	body := `{"email":"Same@Example.com"}`
	if status, _ := call(t, http.MethodPost, server.URL+"/users", "", body); status != http.StatusCreated {
		t.Errorf("first create: status %d, want 201", status)
	}
	if status, _ := call(t, http.MethodPost, server.URL+"/users", "", `{"email":"same@example.com"}`); status != http.StatusConflict {
		t.Errorf("repeated email: status %d, want 409", status)
	}
	if status, _ := call(t, http.MethodPost, server.URL+"/users", "", `not json`); status != http.StatusBadRequest {
		t.Errorf("invalid JSON: status %d, want 400", status)
	}
	big := `{"email":"` + strings.Repeat("a", maxBodyBytes) + `@x"}`
	if status, _ := call(t, http.MethodPost, server.URL+"/users", "", big); status != http.StatusRequestEntityTooLarge {
		t.Errorf("body over the limit: status %d, want 413", status)
	}
}

func TestAdminStatsCountsRequests(t *testing.T) {
	server := newTestServer(t)

	for range 5 {
		call(t, http.MethodGet, server.URL+"/fixed", "", "")
	}
	_, stats := call(t, http.MethodGet, server.URL+"/admin/stats", "", "")
	if stats["totalRequests"].(float64) != 5 {
		t.Errorf("totalRequests = %v, want 5 (admin requests are not counted)", stats["totalRequests"])
	}

	call(t, http.MethodPost, server.URL+"/admin/reset", "", "")
	_, stats = call(t, http.MethodGet, server.URL+"/admin/stats", "", "")
	if stats["totalRequests"].(float64) != 0 {
		t.Errorf("after reset totalRequests = %v, want 0", stats["totalRequests"])
	}
}

func TestStallRemaining(t *testing.T) {
	traffic := newTraffic(30*time.Second, 5*time.Second)

	tests := []struct {
		elapsed time.Duration
		want    time.Duration
	}{
		{0, 0},
		{24 * time.Second, 0},
		{25 * time.Second, 5 * time.Second},
		{28 * time.Second, 2 * time.Second},
		{30 * time.Second, 0},
		{57 * time.Second, 3 * time.Second},
	}
	for _, tt := range tests {
		if got := traffic.stallRemaining(tt.elapsed); got != tt.want {
			t.Errorf("stallRemaining(%v) = %v, want %v", tt.elapsed, got, tt.want)
		}
	}
}

func TestBoundedMapEvictsOldest(t *testing.T) {
	m := newBoundedMap[string, int](2)
	m.Add("a", 1)
	m.Add("b", 2)
	m.Add("c", 3)

	if _, ok := m.Get("a"); ok {
		t.Error("oldest key a is still present, want evicted")
	}
	if _, ok := m.Get("c"); !ok {
		t.Error("newest key c is missing")
	}
	if m.Add("b", 20) {
		t.Error("Add of an existing key succeeded, want false")
	}
	if m.Len() != 2 {
		t.Errorf("Len() = %d, want 2", m.Len())
	}
}

func jsonNumber(v any) string {
	b, _ := json.Marshal(v)
	return string(b)
}

func TestOpenAPISpecIsServed(t *testing.T) {
	server := newTestServer(t)

	resp, err := http.Get(server.URL + "/openapi.yaml")
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()

	if !strings.HasPrefix(string(body), "openapi:") {
		t.Errorf("GET /openapi.yaml returned %d bytes without an openapi header: is the //go:embed directive in place?", len(body))
	}
}
