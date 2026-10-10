package single

import (
	"math"
	"time"
)

func offset(i, targetRps, rampUpSeconds int) time.Duration {
	n := float64(i)
	rate := float64(targetRps)
	rampUp := float64(rampUpSeconds)

	var seconds float64
	if rampRequests := rate * rampUp / 2; n < rampRequests {
		seconds = math.Sqrt(2 * rampUp * n / rate)
	} else {
		seconds = n/rate + rampUp/2
	}

	return time.Duration(seconds * float64(time.Second))
}

func plannedCount(elapsed time.Duration, targetRps, rampUpSeconds int) float64 {
	t := elapsed.Seconds()
	rate := float64(targetRps)
	rampUp := float64(rampUpSeconds)

	if t <= 0 {
		return 0
	}
	if t < rampUp {
		return rate * t * t / (2 * rampUp)
	}
	return rate*rampUp/2 + rate*(t-rampUp)
}
