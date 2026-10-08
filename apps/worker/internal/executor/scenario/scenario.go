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
	Method      string     `json:"method"`
	URL         string     `json:"url"`
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

type Summary struct {
	TotalSteps   int     `json:"totalSteps"`
	OkCount      int     `json:"okCount"`
	FailedCount  int     `json:"failedCount"`
	SkippedCount int     `json:"skippedCount"`
	DurationMs   float64 `json:"durationMs"`
}

type Result struct {
	Summary Summary      `json:"summary"`
	Steps   []StepResult `json:"steps"`
}
