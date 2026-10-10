package single

import (
	"math"
	"testing"
	"time"
)

func TestOffset(t *testing.T) {
	tests := []struct {
		name          string
		i             int
		targetRps     int
		rampUpSeconds int
		want          time.Duration
	}{
		{"first request starts immediately", 0, 100, 10, 0},
		{"ramp-up: 5 requests in the first second", 5, 100, 10, time.Second},
		{"end of ramp-up", 500, 100, 10, 10 * time.Second},
		{"after ramp-up: fixed interval", 501, 100, 10, 10*time.Second + 10*time.Millisecond},
		{"no ramp-up: fixed interval", 3, 100, 0, 30 * time.Millisecond},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := offset(tt.i, tt.targetRps, tt.rampUpSeconds)
			if diff := got - tt.want; diff < -time.Microsecond || diff > time.Microsecond {
				t.Errorf("offset(%d, %d, %d) = %v, want %v", tt.i, tt.targetRps, tt.rampUpSeconds, got, tt.want)
			}
		})
	}
}

func TestPlannedCount(t *testing.T) {
	tests := []struct {
		name          string
		elapsed       time.Duration
		targetRps     int
		rampUpSeconds int
		want          float64
	}{
		{"before start", -time.Second, 100, 10, 0},
		{"first second of ramp-up", time.Second, 100, 10, 5},
		{"end of ramp-up", 10 * time.Second, 100, 10, 500},
		{"after ramp-up", 11 * time.Second, 100, 10, 600},
		{"no ramp-up", 2 * time.Second, 100, 0, 200},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := plannedCount(tt.elapsed, tt.targetRps, tt.rampUpSeconds)
			if math.Abs(got-tt.want) > 1e-9 {
				t.Errorf("plannedCount(%v, %d, %d) = %v, want %v", tt.elapsed, tt.targetRps, tt.rampUpSeconds, got, tt.want)
			}
		})
	}
}

func TestPlannedCountIsInverseOfOffset(t *testing.T) {
	for i := 0; i <= 1000; i++ {
		got := plannedCount(offset(i, 100, 10), 100, 10)
		if math.Abs(got-float64(i)) > 1e-3 {
			t.Fatalf("plannedCount(offset(%d)) = %v, want %d", i, got, i)
		}
	}
}
