package executor

import (
	"encoding/json"
	"fmt"
	"worker/internal/broker"
	"worker/internal/executor/load/single"
	"worker/internal/executor/scenario"
	"worker/internal/job"
)

func New(p job.Payload, live broker.Publisher) (Executor, error) {
	switch p.Type {
	case job.TestTypeSingle:
		var cfg single.Config
		if err := json.Unmarshal(p.Config, &cfg); err != nil {
			return nil, fmt.Errorf("decode single test config: %w", err)
		}
		return single.New(p.TestId, cfg, live), nil

	case job.TestTypeScenario:
		var cfg scenario.Config
		if err := json.Unmarshal(p.Config, &cfg); err != nil {
			return nil, fmt.Errorf("decode scenario test config: %w", err)
		}
		return scenario.New(p.TestId, cfg), nil

	default:
		return nil, fmt.Errorf("unsupported test type: %q", p.Type)
	}
}
