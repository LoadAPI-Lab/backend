package scenario

import (
	"net/http"
	"worker/internal/job"
)

type Executor struct {
	testId string
	cfg    Config
	client *http.Client
}

type StepStatus string

const (
	StepStatusOK      StepStatus = "OK"
	StepStatusFailed  StepStatus = "FAILED"
	StepStatusSkipped StepStatus = "SKIPPED"
)

type Step struct {
	Target  job.Target    `json:"target"`
	Extract []ExtractRule `json:"extract"`
}

type StepResult struct {
	Status      StepStatus `json:"status"`
	StatusCode  int        `json:"statusCode,omitempty"`
	DurationMs  float64    `json:"durationMs,omitempty"`
	Description string     `json:"description,omitempty"`
}

type ExtractRule struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

type Config struct {
	Steps []Step `json:"steps"`
}
