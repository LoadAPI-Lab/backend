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

const resultsQueue = "test_results"

func runTest(ctx context.Context, payload job.Payload, live, results broker.Publisher) error {
	startedAt := time.Now()

	started := event.NewStarted(payload.TestId, payload.Type, startedAt)
	if err := publishEvent(ctx, results, started); err != nil {
		return fmt.Errorf("publish started event: %w", err)
	}

	exec, err := executor.New(payload, live)
	if err != nil {
		failed := event.NewFailed(payload.TestId, payload.Type, startedAt, time.Now(), err.Error())
		return publishFinished(ctx, results, failed)
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

	return publishFinished(ctx, results, finished)
}

func publishFinished(ctx context.Context, results broker.Publisher, finished event.Finished) error {
	if err := publishEvent(context.WithoutCancel(ctx), results, finished); err != nil {
		return fmt.Errorf("publish finished event: %w", err)
	}
	return nil
}

func publishEvent(ctx context.Context, results broker.Publisher, e any) error {
	body, err := json.Marshal(e)
	if err != nil {
		return err
	}
	return results.Publish(ctx, resultsQueue, body)
}
