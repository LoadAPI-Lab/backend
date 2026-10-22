package main

import (
	"net/http"
	"strings"
	"sync/atomic"
	"time"
)

const maxSeconds = 3600

type traffic struct {
	anchor     atomic.Int64
	total      atomic.Int64
	perSecond  [maxSeconds]atomic.Int64
	stallEvery time.Duration
	stallFor   time.Duration
}

type statsResponse struct {
	Since         time.Time `json:"since"`
	TotalRequests int64     `json:"totalRequests"`
	PerSecond     []int64   `json:"perSecond"`
}

func newTraffic(stallEvery, stallFor time.Duration) *traffic {
	t := &traffic{stallEvery: stallEvery, stallFor: stallFor}
	t.anchor.Store(time.Now().UnixNano())
	return t
}

func (t *traffic) middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/admin/") || r.URL.Path == "/openapi.yaml" {
			next.ServeHTTP(w, r)
			return
		}

		elapsed := t.elapsed(time.Now())
		t.record(elapsed)
		if !wait(r.Context(), t.stallRemaining(elapsed)) {
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (t *traffic) elapsed(now time.Time) time.Duration {
	return time.Duration(now.UnixNano() - t.anchor.Load())
}

func (t *traffic) record(elapsed time.Duration) {
	t.total.Add(1)
	if second := int(elapsed / time.Second); second >= 0 && second < maxSeconds {
		t.perSecond[second].Add(1)
	}
}

func (t *traffic) stallRemaining(elapsed time.Duration) time.Duration {
	if t.stallEvery == 0 || elapsed < 0 {
		return 0
	}
	phase := elapsed % t.stallEvery
	if start := t.stallEvery - t.stallFor; phase >= start {
		return t.stallEvery - phase
	}
	return 0
}

func (t *traffic) handleStats(w http.ResponseWriter, r *http.Request) {
	anchor := t.anchor.Load()
	seconds := min(int(t.elapsed(time.Now())/time.Second)+1, maxSeconds)

	perSecond := make([]int64, seconds)
	for i := range perSecond {
		perSecond[i] = t.perSecond[i].Load()
	}

	writeJSON(w, http.StatusOK, statsResponse{
		Since:         time.Unix(0, anchor).UTC().Truncate(time.Millisecond),
		TotalRequests: t.total.Load(),
		PerSecond:     perSecond,
	})
}

func (t *traffic) handleReset(w http.ResponseWriter, r *http.Request) {
	for i := range t.perSecond {
		t.perSecond[i].Store(0)
	}
	t.total.Store(0)
	t.anchor.Store(time.Now().UnixNano())
	w.WriteHeader(http.StatusNoContent)
}
