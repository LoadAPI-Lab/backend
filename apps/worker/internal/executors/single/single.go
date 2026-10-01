package single

import (
	"net/http"
	"worker/internal/job"
	"worker/internal/ratelimiter"
)

type Executor struct {
	testId  string
	cfg     Config
	client  *http.Client
	limiter *ratelimiter.Limiter
}

type LoadProfile struct {
	TargetRPS       int `json:"targetRps"`
	DurationSeconds int `json:"durationSeconds"`
	RampUpSeconds   int `json:"rampUpSeconds"`
}

type Config struct {
	Target      job.Target  `json:"target"`
	LoadProfile LoadProfile `json:"loadProfile"`
}
