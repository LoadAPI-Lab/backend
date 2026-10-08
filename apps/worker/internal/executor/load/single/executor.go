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
	"worker/internal/ratelimiter"
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
		testId:  testId,
		cfg:     cfg,
		client:  httpclient.New(reqTimeout),
		limiter: ratelimiter.New(cfg.TargetRPS),
		live:    live,
	}
}

func (e *Executor) Run(ctx context.Context) (any, error) {
	runCtx, cancel := context.WithTimeout(ctx, time.Duration(e.cfg.DurationSeconds)*time.Second)
	defer cancel()

	results := make(chan requestResult, 1024)

	var wg sync.WaitGroup
	workerCount := workerCountFor(e.cfg.TargetRPS)
	for i := 0; i < workerCount; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			e.worker(runCtx, results)
		}()
	}

	go func() {
		wg.Wait()
		close(results)
	}()

	return nil, e.aggregate(ctx, results)
}

func (e *Executor) worker(ctx context.Context, results chan<- requestResult) {
	for {
		if err := e.limiter.Wait(ctx); err != nil {
			return
		}

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

func (e *Executor) aggregate(ctx context.Context, results <-chan requestResult) error {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	start := time.Now()
	var success, failed int
	latencies := metrics.NewLatencyWindow()

	for {
		select {
		case r, ok := <-results:
			if !ok {
				return e.publishSnapshot(context.Background(), e.snapshot(start, success, failed, latencies))
			}

			if r.err != nil {
				failed++
			} else {
				success++
				latencies.Add(r.duration)
			}
		case <-ticker.C:
			if err := e.publishSnapshot(ctx, e.snapshot(start, success, failed, latencies)); err != nil {
				return err
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
