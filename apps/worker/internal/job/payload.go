package job

import "encoding/json"

type TestType string

const (
	TestTypeSingle     TestType = "single"
	TestTypeBatch      TestType = "batch"
	TestTypeScenario   TestType = "scenario"
	TestTypeRoundRobin TestType = "round_robin"
)

type Payload struct {
	TestId string          `json:"testId"`
	Type   TestType        `json:"type"`
	Config json.RawMessage `json:"config"`
}
