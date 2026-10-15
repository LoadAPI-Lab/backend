package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
	"worker/internal/broker"
	"worker/internal/event"
	"worker/internal/executor"
	"worker/internal/job"
)

const (
	jobsQueue              = "test_jobs"
	resultsQueue           = "test_results"
	finishedPublishTimeout = 10 * time.Second
)

func runTest(ctx context.Context, payload job.Payload, snapshotPublisher, eventPublisher broker.Publisher) error {
	startedAt := time.Now()

	started := event.NewStarted(payload.TestId, payload.Type, startedAt)
	if err := publishEvent(ctx, eventPublisher, started); err != nil {
		return fmt.Errorf("publish started event: %w", err)
	}

	exec, err := executor.New(payload, snapshotPublisher)
	if err != nil {
		failed := event.NewFailed(payload.TestId, payload.Type, startedAt, time.Now(), err.Error())
		return publishFinished(ctx, eventPublisher, failed)
	}

	result, err := exec.Run(ctx)
	finishedAt := time.Now()

	var finished event.Finished
	switch {
	case ctx.Err() != nil:
		finished = event.NewFinished(payload.TestId, payload.Type, event.StatusStopped, startedAt, finishedAt, result)
	case err != nil:
		finished = event.NewFailed(payload.TestId, payload.Type, startedAt, finishedAt, err.Error())
	default:
		finished = event.NewFinished(payload.TestId, payload.Type, event.StatusCompleted, startedAt, finishedAt, result)
	}

	return publishFinished(ctx, eventPublisher, finished)
}

func publishFinished(ctx context.Context, eventPublisher broker.Publisher, finished event.Finished) error {
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), finishedPublishTimeout)
	defer cancel()

	if err := publishEvent(ctx, eventPublisher, finished); err != nil {
		return fmt.Errorf("publish finished event: %w", err)
	}
	return nil
}

func publishEvent(ctx context.Context, eventPublisher broker.Publisher, e any) error {
	body, err := json.Marshal(e)
	if err != nil {
		return err
	}
	return eventPublisher.Publish(ctx, resultsQueue, body)
}
