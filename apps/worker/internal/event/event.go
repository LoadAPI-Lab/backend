package event

import (
	"time"
	"worker/internal/job"
)

type Type string

const (
	TypeStarted  Type = "started"
	TypeFinished Type = "finished"
)

type Status string

const (
	StatusCompleted Status = "COMPLETED"
	StatusStopped   Status = "STOPPED"
	StatusFailed    Status = "FAILED"
)

type Started struct {
	TestId    string       `json:"testId"`
	TestType  job.TestType `json:"testType"`
	EventType Type         `json:"eventType"`
	Timestamp time.Time    `json:"timestamp"`
}

type Finished struct {
	TestId     string       `json:"testId"`
	TestType   job.TestType `json:"testType"`
	EventType  Type         `json:"eventType"`
	Status     Status       `json:"status"`
	Reason     string       `json:"reason,omitempty"`
	Result     any          `json:"result,omitempty"`
	StartedAt  time.Time    `json:"startedAt"`
	FinishedAt time.Time    `json:"finishedAt"`
}

func NewFinished(testId string, testType job.TestType, status Status, startedAt, finishedAt time.Time, result any) Finished {
	return Finished{
		TestId:     testId,
		TestType:   testType,
		EventType:  TypeFinished,
		Status:     status,
		StartedAt:  contractTime(startedAt),
		FinishedAt: contractTime(finishedAt),
		Result:     result,
	}
}

func NewStarted(testId string, testType job.TestType, at time.Time) Started {
	return Started{
		TestId:    testId,
		TestType:  testType,
		EventType: TypeStarted,
		Timestamp: at.UTC().Truncate(time.Millisecond),
	}
}

func NewFailed(testId string, testType job.TestType, startedAt, finishedAt time.Time, reason string) Finished {
	return Finished{
		TestId:     testId,
		TestType:   testType,
		EventType:  TypeFinished,
		Status:     StatusFailed,
		Reason:     reason,
		StartedAt:  contractTime(startedAt),
		FinishedAt: contractTime(finishedAt),
	}
}

func contractTime(t time.Time) time.Time {
	return t.UTC().Truncate(time.Millisecond)
}
