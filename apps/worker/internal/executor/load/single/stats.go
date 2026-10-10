package single

import "worker/internal/metrics"

type stats struct {
	success       int
	failed        int
	late          int
	responseTimes *metrics.LatencyWindow
	serviceTimes  *metrics.LatencyWindow
}

func newStats() *stats {
	return &stats{
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
		return
	}

	s.success++
	s.responseTimes.Add(r.responseTime)
	s.serviceTimes.Add(r.serviceTime)
}

func (s *stats) reset() {
	s.success, s.failed, s.late = 0, 0, 0
	s.responseTimes.Reset()
	s.serviceTimes.Reset()
}
