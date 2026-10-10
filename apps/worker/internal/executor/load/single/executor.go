package single

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"worker/internal/broker"
	"worker/internal/executor/load"
	"worker/internal/httpclient"
	"worker/internal/metrics"
	"worker/internal/template"

	"net/http"
	"strings"
	"sync"
	"time"
)

const reqTimeout = 10 * time.Second

type requestResult struct {
	duration time.Duration
	err      error
}

func New(testId string, cfg Config, live broker.Publisher) *Executor {
	return &Executor{
		testId: testId,
		cfg:    cfg,
		client: httpclient.New(reqTimeout),
		live:   live,
	}
}

func (e *Executor) Run(ctx context.Context) (any, error) {
	runCtx, cancel := context.WithTimeout(ctx, time.Duration(e.cfg.DurationSeconds)*time.Second)
	defer cancel()

	ticks := make(chan time.Time)
	go e.pace(runCtx, ticks)

	results := make(chan requestResult, 1024)

	var wg sync.WaitGroup
	workerCount := workerCountFor(e.cfg.TargetRPS)
	for i := 0; i < workerCount; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			e.worker(runCtx, ticks, results)
		}()
	}

	go func() {
		wg.Wait()
		close(results)
	}()

	return e.aggregate(ctx, results)
}

func (e *Executor) pace(ctx context.Context, ticks chan<- time.Time) {
	defer close(ticks)

	start := time.Now()
	interval := time.Second / time.Duration(e.cfg.TargetRPS)

	for i := 0; ; i++ {
		planned := start.Add(time.Duration(i) * interval)

		if wait := time.Until(planned); wait > 0 {
			select {
			case <-time.After(wait):
			case <-ctx.Done():
				return
			}
		}

		select {
		case ticks <- planned:
		case <-ctx.Done():
			return
		}
	}
}

func (e *Executor) worker(ctx context.Context, ticks <-chan time.Time, results chan<- requestResult) {
	for range ticks {
		start := time.Now()
		err := e.doRequest(ctx)
		if ctx.Err() != nil {
			return
		}
		results <- requestResult{duration: time.Since(start), err: err}
	}
}

func (e *Executor) doRequest(ctx context.Context) error {
	body := template.Resolve(e.cfg.Target.Body)

	req, err := http.NewRequestWithContext(
		ctx,
		e.cfg.Target.Method,
		e.cfg.Target.URL,
		strings.NewReader(body),
	)

	if err != nil {
		return err
	}

	for k, v := range e.cfg.Target.Headers {
		req.Header.Set(k, v)
	}

	resp, err := e.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)

	if resp.StatusCode >= 400 {
		return fmt.Errorf("http %d", resp.StatusCode)

	}

	return nil
}

func (e *Executor) aggregate(ctx context.Context, results <-chan requestResult) (load.Result, error) {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	start := time.Now()
	var success, failed int
	latencies := metrics.NewLatencyWindow()

	var totalSuccess, totalFailed int
	totalLatencies := metrics.NewLatencyWindow()

	for {
		select {
		case r, ok := <-results:
			if !ok {
				if err := e.publishSnapshot(context.Background(), e.snapshot(start, success, failed, latencies)); err != nil {
					return load.Result{}, err
				}
				return e.result(start, totalSuccess, totalFailed, totalLatencies), nil
			}

			if r.err != nil {
				failed++
				totalFailed++
			} else {
				success++
				totalSuccess++
				latencies.Add(r.duration)
				totalLatencies.Add(r.duration)
			}
		case <-ticker.C:
			if err := e.publishSnapshot(ctx, e.snapshot(start, success, failed, latencies)); err != nil {
				return load.Result{}, err
			}
			success, failed = 0, 0
			latencies.Reset()
		}
	}
}

func (e *Executor) snapshot(start time.Time, success, failed int, latencies *metrics.LatencyWindow) load.Snapshot {
	route := load.RouteSnapshot{
		Method:       e.cfg.Target.Method,
		URL:          e.cfg.Target.URL,
		SuccessCount: success,
		ErrorCount:   failed,
	}
	if success > 0 {
		p50, p95, p99 := latencies.Percentiles()
		route.ServiceTime = &load.Percentiles{P50Ms: toMs(p50), P95Ms: toMs(p95), P99Ms: toMs(p99)}
	}

	return load.Snapshot{
		TestId:         e.testId,
		Timestamp:      time.Now().UTC().Truncate(time.Millisecond),
		ElapsedSeconds: int(time.Since(start).Seconds()),
		TargetRps:      e.cfg.TargetRPS,
		ActualRps:      success + failed,
		Routes:         []load.RouteSnapshot{route},
	}
}

func (e *Executor) result(start time.Time, success, failed int, latencies *metrics.LatencyWindow) load.Result {
	duration := time.Since(start)
	total := success + failed

	route := load.RouteResult{
		Method:        e.cfg.Target.Method,
		URL:           e.cfg.Target.URL,
		TotalRequests: total,
		SuccessCount:  success,
		ErrorCount:    failed,
	}
	if total > 0 {
		route.ErrorRate = float64(failed) / float64(total)
	}
	if success > 0 {
		p50, p95, p99 := latencies.Percentiles()
		route.ServiceTime = &load.Percentiles{P50Ms: toMs(p50), P95Ms: toMs(p95), P99Ms: toMs(p99)}
	}

	return load.Result{
		DurationMs: toMs(duration),
		TargetRps:  e.cfg.TargetRPS,
		AvgRps:     float64(total) / duration.Seconds(),
		Routes:     []load.RouteResult{route},
	}
}

func (e *Executor) publishSnapshot(ctx context.Context, snapshot load.Snapshot) error {
	body, err := json.Marshal(snapshot)
	if err != nil {
		return err
	}
	return e.live.Publish(ctx, "metrics:"+e.testId, body)
}

func workerCountFor(targetRps int) int {
	if targetRps < 1 {
		return 1
	}

	return targetRps
}

func toMs(d time.Duration) float64 {
	return float64(d) / float64(time.Millisecond)
}
