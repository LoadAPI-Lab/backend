package single

import (
	"worker/internal/metrics"
	"worker/internal/neterror"
)

type stats struct {
	success       int
	failed        int
	late          int
	statusCodes   map[int]int
	errors        map[neterror.Category]int
	responseTimes *metrics.LatencyWindow
	serviceTimes  *metrics.LatencyWindow
}

func newStats() *stats {
	return &stats{
		statusCodes:   make(map[int]int),
		errors:        make(map[neterror.Category]int),
		responseTimes: metrics.NewLatencyWindow(),
		serviceTimes:  metrics.NewLatencyWindow(),
	}
}

func (s *stats) add(r requestResult) {
	if r.late {
		s.late++
	}

	if r.err != nil {
		s.failed++
		s.errors[neterror.Classify(r.err)]++
		return
	}

	s.statusCodes[r.statusCode]++

	if r.statusCode >= 400 {
		s.failed++
		return
	}

	s.success++
	s.responseTimes.Add(r.responseTime)
	s.serviceTimes.Add(r.serviceTime)
}

func (s *stats) reset() {
	s.success, s.failed, s.late = 0, 0, 0
	clear(s.statusCodes)
	clear(s.errors)
	s.responseTimes.Reset()
	s.serviceTimes.Reset()
}
