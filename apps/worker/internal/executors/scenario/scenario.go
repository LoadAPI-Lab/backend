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

type Step struct {
	Target  job.Target    `json:"target"`
	Extract []ExtractRule `json:"extract"`
}

type ExtractRule struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

type Config struct {
	Steps []Step `json:"steps"`
}
