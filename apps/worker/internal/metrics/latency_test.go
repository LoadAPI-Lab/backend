package metrics

import (
	"testing"
	"time"
)

func TestPercentil(t *testing.T) {
	tests := []struct {
		name          string
		input         []time.Duration
		p50, p95, p99 time.Duration
	}{
		{
			name:  "empty window",
			input: nil,
			p50:   0, p95: 0, p99: 0,
		},
		{
			name:  "one value",
			input: ms(7),
			p50:   7 * time.Millisecond, p95: 7 * time.Millisecond, p99: 7 * time.Millisecond,
		},
		{
			name:  "100 values from 1 to 100 ms",
			input: msRange(1, 100),
			p50:   50 * time.Millisecond, p95: 95 * time.Millisecond, p99: 99 * time.Millisecond,
		},
		{
			name:  "10 values, math ceil",
			input: msRange(1, 10),
			p50:   5 * time.Millisecond, p95: 10 * time.Millisecond, p99: 10 * time.Millisecond,
		},
		{
			name:  "unsorted entry",
			input: ms(30, 10, 20),
			p50:   20 * time.Millisecond, p95: 30 * time.Millisecond, p99: 30 * time.Millisecond,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := NewLatencyWindow()
			for _, d := range tt.input {
				w.Add(d)
			}

			p50, p95, p99 := w.Percentiles()

			if p50 != tt.p50 {
				t.Errorf("p50 = %v, want %v", p50, tt.p50)
			}
			if p95 != tt.p95 {
				t.Errorf("p95 = %v, want %v", p95, tt.p95)
			}
			if p99 != tt.p99 {
				t.Errorf("p99 = %v, want %v", p99, tt.p99)
			}
		})
	}
}

func TestReset(t *testing.T) {
	w := NewLatencyWindow()
	for _, d := range msRange(1, 100) {
		w.Add(d)
	}

	w.Reset()

	if p50, _, _ := w.Percentiles(); p50 != 0 {
		t.Fatalf("after Reset p50 = %v, want 0", p50)
	}

	w.Add(5 * time.Millisecond)
	if p50, p95, p99 := w.Percentiles(); p50 != 5*time.Millisecond || p95 != 5*time.Millisecond || p99 != 5*time.Millisecond {
		t.Errorf("after Reset and one Add: p50=%v p95=%v p99=%v, want all 5ms", p50, p95, p99)
	}
}

func ms(values ...int) []time.Duration {
	out := make([]time.Duration, len(values))
	for i, v := range values {
		out[i] = time.Duration(v) * time.Millisecond
	}
	return out
}

func msRange(from, to int) []time.Duration {
	out := make([]time.Duration, 0, to-from+1)
	for v := from; v <= to; v++ {
		out = append(out, time.Duration(v)*time.Millisecond)
	}
	return out
}
