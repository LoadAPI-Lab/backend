package single

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"sync"
	"worker/internal/broker"
	"worker/internal/executor/load"
	"worker/internal/httpclient"
	"worker/internal/metrics"
	"worker/internal/template"

	"net/http"
	"strings"
	"time"
)

const (
	reqTimeout    = 10 * time.Second
	maxWorkers    = 10_000
	lateThreshold = 10 * time.Millisecond
)

type requestResult struct {
	responseTime time.Duration
	serviceTime  time.Duration
	late         bool
	err          error
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

	results := make(chan requestResult, 1024)
	go e.pace(runCtx, results)

	return e.aggregate(ctx, results)
}

func (e *Executor) pace(ctx context.Context, results chan<- requestResult) {
	ticks := make(chan time.Time)
	var wg sync.WaitGroup
	defer func() {
		close(ticks)
		wg.Wait()
		close(results)
	}()

	workers := 0
	start := time.Now()

	for i := 0; ; i++ {
		planned := start.Add(offset(i, e.cfg.TargetRPS, e.cfg.RampUpSeconds))

		if wait := time.Until(planned); wait > 0 {
			select {
			case <-time.After(wait):
			case <-ctx.Done():
				return
			}
		}

		select {
		case ticks <- planned:
			continue
		default:
		}

		if workers < maxWorkers {
			workers++
			wg.Add(1)
			go func() {
				defer wg.Done()
				e.worker(ctx, ticks, results)
			}()
		}

		select {
		case ticks <- planned:
		case <-ctx.Done():
			return
		}
	}
}

func (e *Executor) worker(ctx context.Context, ticks <-chan time.Time, results chan<- requestResult) {
	for planned := range ticks {
		sent := time.Now()
		err := e.doRequest(ctx)
		if ctx.Err() != nil {
			return
		}
		done := time.Now()

		results <- requestResult{
			responseTime: done.Sub(planned),
			serviceTime:  done.Sub(sent),
			late:         sent.Sub(planned) > lateThreshold,
			err:          err,
		}
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
	second := newStats()
	total := newStats()

	for {
		select {
		case r, ok := <-results:
			if !ok {
				if err := e.publishSnapshot(context.Background(), e.snapshot(start, second)); err != nil {
					return load.Result{}, err
				}
				return e.result(start, total), nil
			}

			second.add(r)
			total.add(r)
		case <-ticker.C:
			if err := e.publishSnapshot(ctx, e.snapshot(start, second)); err != nil {
				return load.Result{}, err
			}
			second.reset()
		}
	}
}

func (e *Executor) snapshot(start time.Time, s *stats) load.Snapshot {
	route := load.RouteSnapshot{
		Method:       e.cfg.Target.Method,
		URL:          e.cfg.Target.URL,
		SuccessCount: s.success,
		ErrorCount:   s.failed,
		LateCount:    s.late,
	}
	if s.success > 0 {
		route.ResponseTime = percentiles(s.responseTimes)
		route.ServiceTime = percentiles(s.serviceTimes)
	}

	elapsed := time.Since(start)
	planned := plannedCount(elapsed, e.cfg.TargetRPS, e.cfg.RampUpSeconds) -
		plannedCount(elapsed-time.Second, e.cfg.TargetRPS, e.cfg.RampUpSeconds)

	return load.Snapshot{
		TestId:         e.testId,
		Timestamp:      time.Now().UTC().Truncate(time.Millisecond),
		ElapsedSeconds: int(elapsed.Seconds()),
		TargetRps:      int(math.Round(planned)),
		ActualRps:      s.success + s.failed,
		Routes:         []load.RouteSnapshot{route},
	}
}

func (e *Executor) result(start time.Time, s *stats) load.Result {
	duration := time.Since(start)
	total := s.success + s.failed

	route := load.RouteResult{
		Method:        e.cfg.Target.Method,
		URL:           e.cfg.Target.URL,
		TotalRequests: total,
		SuccessCount:  s.success,
		ErrorCount:    s.failed,
		LateCount:     s.late,
	}
	if total > 0 {
		route.ErrorRate = float64(s.failed) / float64(total)
	}
	if s.success > 0 {
		route.ResponseTime = percentiles(s.responseTimes)
		route.ServiceTime = percentiles(s.serviceTimes)
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

func percentiles(w *metrics.LatencyWindow) *load.Percentiles {
	p50, p95, p99 := w.Percentiles()
	return &load.Percentiles{P50Ms: toMs(p50), P95Ms: toMs(p95), P99Ms: toMs(p99)}
}

func toMs(d time.Duration) float64 {
	return float64(d) / float64(time.Millisecond)
}
