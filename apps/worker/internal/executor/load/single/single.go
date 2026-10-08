package single

import (
	"net/http"
	"worker/internal/broker"
	"worker/internal/job"
	"worker/internal/ratelimiter"
)

type Executor struct {
	testId  string
	cfg     Config
	client  *http.Client
	limiter *ratelimiter.Limiter
	live    broker.Publisher
}

type Config struct {
	Target          job.Target `json:"target"`
	TargetRPS       int        `json:"targetRps"`
	DurationSeconds int        `json:"durationSeconds"`
	RampUpSeconds   int        `json:"rampUpSeconds"`
}
