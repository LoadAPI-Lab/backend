package metrics

import (
	"math"
	"slices"
	"time"
)

type LatencyWindow struct {
	durations []time.Duration
}

func NewLatencyWindow() *LatencyWindow {
	return &LatencyWindow{
		durations: make([]time.Duration, 0, 1024),
	}
}

func (lw *LatencyWindow) Add(d time.Duration) {
	lw.durations = append(lw.durations, d)
}

func (lw *LatencyWindow) Percentiles() (p50, p95, p99 time.Duration) {
	if len(lw.durations) == 0 {
		return 0, 0, 0
	}

	slices.Sort(lw.durations)
	return percentile(lw.durations, 50), percentile(lw.durations, 95), percentile(lw.durations, 99)
}

func (lw *LatencyWindow) Reset() {
	lw.durations = lw.durations[:0]
}

func percentile(sorted []time.Duration, p float64) time.Duration {
	rank := int(math.Ceil(p / 100 * float64(len(sorted))))
	if rank < 1 {
		rank = 1
	}

	return sorted[rank-1]
}
