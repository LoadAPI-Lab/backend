package metrics

import "time"

type Snapshot struct {
	TestId       string    `json:"testId"`
	Timestamp    time.Time `json:"timestamp"`
	RPS          int       `json:"rps"`
	SuccessCount int       `json:"successCount"`
	ErrorCount   int       `json:"errorCount"`
	P50Ms        float64   `json:"p50Ms"`
	P95Ms        float64   `json:"p95Ms"`
	P99Ms        float64   `json:"p99Ms"`
}
