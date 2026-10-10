package single

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
	"worker/internal/executor/load"
	"worker/internal/job"
)

type recordingPublisher struct {
	snapshots []load.Snapshot
}

func (p *recordingPublisher) Publish(ctx context.Context, destination string, body []byte) error {
	var snapshot load.Snapshot
	if err := json.Unmarshal(body, &snapshot); err != nil {
		return err
	}
	p.snapshots = append(p.snapshots, snapshot)
	return nil
}

func newServer(t *testing.T, delay time.Duration) *httptest.Server {
	t.Helper()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(delay)
	}))
	t.Cleanup(server.Close)
	return server
}

func runSingle(t *testing.T, ctx context.Context, cfg Config) (load.RouteResult, *recordingPublisher) {
	t.Helper()
	publisher := &recordingPublisher{}

	got, err := New("test-1", cfg, publisher).Run(ctx)
	if err != nil {
		t.Fatalf("Run() error: %v", err)
	}

	result, ok := got.(load.Result)
	if !ok {
		t.Fatalf("Run() returned %T, want load.Result", got)
	}
	if len(result.Routes) != 1 {
		t.Fatalf("got %d routes, want 1", len(result.Routes))
	}
	return result.Routes[0], publisher
}

func TestRunSendsPlannedNumberOfRequests(t *testing.T) {
	server := newServer(t, 0)
	cfg := Config{
		Target:          job.Target{Method: http.MethodGet, URL: server.URL},
		TargetRPS:       50,
		DurationSeconds: 2,
	}

	route, publisher := runSingle(t, context.Background(), cfg)

	if route.TotalRequests != 100 {
		t.Errorf("TotalRequests = %d, want 100", route.TotalRequests)
	}
	if route.ErrorCount != 0 {
		t.Errorf("ErrorCount = %d, want 0", route.ErrorCount)
	}
	if len(publisher.snapshots) < 2 {
		t.Errorf("got %d snapshots, want at least 2", len(publisher.snapshots))
	}
}

func TestRunWaitsForInFlightRequests(t *testing.T) {
	server := newServer(t, 500*time.Millisecond)
	cfg := Config{
		Target:          job.Target{Method: http.MethodGet, URL: server.URL},
		TargetRPS:       20,
		DurationSeconds: 2,
	}

	route, _ := runSingle(t, context.Background(), cfg)

	if route.TotalRequests != 40 {
		t.Errorf("TotalRequests = %d, want 40 (requests in flight at the end must be counted)", route.TotalRequests)
	}
	if route.ServiceTime == nil || route.ServiceTime.P50Ms < 500 {
		t.Errorf("ServiceTime = %+v, want p50 >= 500ms", route.ServiceTime)
	}
	if route.ResponseTime == nil || route.ResponseTime.P50Ms < route.ServiceTime.P50Ms {
		t.Errorf("ResponseTime = %+v, want p50 >= ServiceTime p50 %v", route.ResponseTime, route.ServiceTime.P50Ms)
	}
}

func TestRunStopsOnCancel(t *testing.T) {
	server := newServer(t, time.Second)
	cfg := Config{
		Target:          job.Target{Method: http.MethodGet, URL: server.URL},
		TargetRPS:       20,
		DurationSeconds: 10,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 1500*time.Millisecond)
	defer cancel()

	start := time.Now()
	runSingle(t, ctx, cfg)

	if elapsed := time.Since(start); elapsed > 2*time.Second {
		t.Errorf("Run() took %v after cancel, want it to stop right away", elapsed)
	}
}
