package event

import (
	"time"
	"worker/internal/job"
)

type Kind string

const (
	KindStarted  Kind = "started"
	KindFinished Kind = "finished"
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
	Event     Kind         `json:"event"`
	Timestamp time.Time    `json:"timestamp"`
}

type Finished struct {
	TestId     string       `json:"testId"`
	TestType   job.TestType `json:"testType"`
	Event      Kind         `json:"event"`
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
		Event:      KindFinished,
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
		Event:     KindStarted,
		Timestamp: at.UTC().Truncate(time.Millisecond),
	}
}

func NewFailed(testId string, testType job.TestType, startedAt, finishedAt time.Time, reason string) Finished {
	return Finished{
		TestId:     testId,
		TestType:   testType,
		Event:      KindFinished,
		Status:     StatusFailed,
		Reason:     reason,
		StartedAt:  contractTime(startedAt),
		FinishedAt: contractTime(finishedAt),
	}
}

func contractTime(t time.Time) time.Time {
	return t.UTC().Truncate(time.Millisecond)
}
