package load

import "time"

type Snapshot struct {
	TestId         string          `json:"testId"`
	Timestamp      time.Time       `json:"timestamp"`
	ElapsedSeconds int             `json:"elapsedSeconds"`
	TargetRps      int             `json:"targetRps"`
	ActualRps      int             `json:"actualRps"`
	Routes         []RouteSnapshot `json:"targets"`
}

type RouteSnapshot struct {
	Method       string               `json:"method"`
	URL          string               `json:"url"`
	SuccessCount int                  `json:"successCount"`
	ErrorCount   int                  `json:"errorCount"`
	LateCount    int                  `json:"lateCount"`
	ResponseTime *Percentiles         `json:"responseTime,omitempty"`
	ServiceTime  *Percentiles         `json:"serviceTime,omitempty"`
	StatusCodes  map[int]int          `json:"statusCodes,omitempty"`
	Errors       map[NetworkError]int `json:"errors,omitempty"`
}

type Percentiles struct {
	P50Ms float64 `json:"p50Ms"`
	P95Ms float64 `json:"p95Ms"`
	P99Ms float64 `json:"p99Ms"`
}

type NetworkError string

const (
	ErrorTimeout           NetworkError = "timeout"
	ErrorConnectionRefused NetworkError = "connection_refused"
	ErrorConnectionReset   NetworkError = "connection_reset"
	ErrorDNS               NetworkError = "dns"
	ErrorOther             NetworkError = "other"
)
