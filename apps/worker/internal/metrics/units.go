package metrics

import "time"

func ToMs(d time.Duration) float64 {
	return float64(d) / float64(time.Millisecond)
}
