package single

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"maps"
	"math"
	"sync"
	"worker/internal/broker"
	"worker/internal/config"
	"worker/internal/executor/load"
	"worker/internal/httpclient"
	"worker/internal/metrics"
	"worker/internal/template"

	"net/http"
	"strings"
	"time"
)

const (
	lateThreshold  = 10 * time.Millisecond
	publishTimeout = 200 * time.Millisecond
)

type requestResult struct {
	statusCode   int
	responseTime time.Duration
	serviceTime  time.Duration
	late         bool
	err          error
}

func New(testId string, cfg Config, snapshotPublisher broker.Publisher) *Executor {
	return &Executor{
		testId:            testId,
		cfg:               cfg,
		client:            httpclient.New(),
		snapshotPublisher: snapshotPublisher,
	}
}

func (e *Executor) Run(ctx context.Context) (any, error) {
	defer e.client.CloseIdleConnections()

	results := make(chan requestResult, 1024)
	go e.schedule(ctx, results)

	return e.aggregate(ctx, results), nil
}

func (e *Executor) schedule(ctx context.Context, results chan<- requestResult) {
	ticks := make(chan time.Time)
	var wg sync.WaitGroup
	defer func() {
		close(ticks)
		wg.Wait()
		close(results)
	}()

	maxWorkers := config.Get().MaxWorkers
	workers := 0
	start := time.Now()
	end := start.Add(e.duration())

	for i := 0; ; i++ {
		reqAt := start.Add(offset(i, e.cfg.TargetRPS, e.cfg.RampUpSeconds))
		if !reqAt.Before(end) {
			return
		}

		if timeToReq := time.Until(reqAt); timeToReq > 0 {
			select {
			case <-time.After(timeToReq):
			case <-ctx.Done():
				return
			}
		}

		select {
		case ticks <- reqAt:
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
		case ticks <- reqAt:
		case <-ctx.Done():
			return
		}
	}
}

func (e *Executor) worker(ctx context.Context, ticks <-chan time.Time, results chan<- requestResult) {
	for planned := range ticks {
		sent := time.Now()
		statusCode, err := e.doRequest(ctx)
		if ctx.Err() != nil {
			return
		}
		done := time.Now()

		results <- requestResult{
			statusCode:   statusCode,
			responseTime: done.Sub(planned),
			serviceTime:  done.Sub(sent),
			late:         sent.Sub(planned) > lateThreshold,
			err:          err,
		}
	}
}

func (e *Executor) doRequest(ctx context.Context) (int, error) {
	body := template.Resolve(e.cfg.Target.Body)

	req, err := http.NewRequestWithContext(
		ctx,
		e.cfg.Target.Method,
		e.cfg.Target.URL,
		strings.NewReader(body),
	)

	if err != nil {
		return 0, err
	}

	for k, v := range e.cfg.Target.Headers {
		req.Header.Set(k, v)
	}

	resp, err := e.client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if _, err := io.Copy(io.Discard, resp.Body); err != nil {
		return 0, err
	}

	return resp.StatusCode, nil
}

func (e *Executor) aggregate(ctx context.Context, results <-chan requestResult) load.Result {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	start := time.Now()
	elapsedSeconds := 0
	second := newStats()
	total := newStats()

	for {
		select {
		case r, ok := <-results:
			if !ok {
				if second.success+second.failed > 0 {
					elapsedSeconds++
					e.publishSnapshot(context.WithoutCancel(ctx), e.snapshot(elapsedSeconds, second))
				}
				return e.result(start, total)
			}

			second.add(r)
			total.add(r)
		case <-ticker.C:
			elapsedSeconds++
			e.publishSnapshot(ctx, e.snapshot(elapsedSeconds, second))
			second.reset()
		}
	}
}

func (e *Executor) snapshot(elapsedSeconds int, s *stats) load.Snapshot {
	route := load.RouteSnapshot{
		Method:       e.cfg.Target.Method,
		URL:          e.cfg.Target.URL,
		SuccessCount: s.success,
		ErrorCount:   s.failed,
		LateCount:    s.late,
		StatusCodes:  maps.Clone(s.statusCodes),
		Errors:       maps.Clone(s.errors),
	}

	if s.success > 0 {
		route.ResponseTime = percentiles(s.responseTimes)
		route.ServiceTime = percentiles(s.serviceTimes)
	}

	secondEnd := min(time.Duration(elapsedSeconds)*time.Second, e.duration())
	secondStart := min(time.Duration(elapsedSeconds-1)*time.Second, e.duration())
	planned := plannedCount(secondEnd, e.cfg.TargetRPS, e.cfg.RampUpSeconds) -
		plannedCount(secondStart, e.cfg.TargetRPS, e.cfg.RampUpSeconds)

	return load.Snapshot{
		TestId:         e.testId,
		Timestamp:      time.Now().UTC().Truncate(time.Millisecond),
		ElapsedSeconds: elapsedSeconds,
		TargetRps:      int(math.Round(planned)),
		ActualRps:      s.success + s.failed,
		Routes:         []load.RouteSnapshot{route},
	}
}

func (e *Executor) result(start time.Time, s *stats) load.Result {
	duration := min(time.Since(start), e.duration())
	total := s.success + s.failed

	route := load.RouteResult{
		Method:        e.cfg.Target.Method,
		URL:           e.cfg.Target.URL,
		TotalRequests: total,
		SuccessCount:  s.success,
		ErrorCount:    s.failed,
		LateCount:     s.late,
		StatusCodes:   s.statusCodes,
		Errors:        s.errors,
	}

	if total > 0 {
		route.ErrorRate = float64(s.failed) / float64(total)
	}

	if s.success > 0 {
		route.ResponseTime = percentiles(s.responseTimes)
		route.ServiceTime = percentiles(s.serviceTimes)
	}

	return load.Result{
		DurationMs: metrics.ToMs(duration),
		TargetRps:  e.cfg.TargetRPS,
		AvgRps:     float64(total) / duration.Seconds(),
		Routes:     []load.RouteResult{route},
	}
}

func (e *Executor) publishSnapshot(ctx context.Context, snapshot load.Snapshot) {
	body, err := json.Marshal(snapshot)
	if err != nil {
		log.Printf("test %s: encode snapshot %d: %v", e.testId, snapshot.ElapsedSeconds, err)
		return
	}

	ctx, cancel := context.WithTimeout(ctx, publishTimeout)
	defer cancel()

	if err := e.snapshotPublisher.Publish(ctx, "snapshot:"+e.testId, body); err != nil {
		log.Printf("test %s: snapshot %d lost: %v", e.testId, snapshot.ElapsedSeconds, err)
	}
}

func (e *Executor) duration() time.Duration {
	return time.Duration(e.cfg.DurationSeconds) * time.Second
}

func percentiles(w *metrics.LatencyWindow) *load.Percentiles {
	p50, p95, p99 := w.Percentiles()
	return &load.Percentiles{P50Ms: metrics.ToMs(p50), P95Ms: metrics.ToMs(p95), P99Ms: metrics.ToMs(p99)}
}
