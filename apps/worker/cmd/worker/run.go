package main

import (
	"context"
	"fmt"
	"time"
	"worker/internal/event"
	"worker/internal/executor"
	"worker/internal/job"
	"worker/internal/metrics"
)

type testPublisher interface {
	metrics.Publisher
	PublishEvent(ctx context.Context, e any) error
}

func runTest(ctx context.Context, payload job.Payload, publisher testPublisher) error {
	startedAt := time.Now()

	started := event.NewStarted(payload.TestId, payload.Type, startedAt)
	if err := publisher.PublishEvent(ctx, started); err != nil {
		return fmt.Errorf("publish started event: %w", err)
	}

	exec, err := executor.New(payload)
	if err != nil {
		failed := event.NewFailed(payload.TestId, payload.Type, startedAt, time.Now(), err.Error())
		if err := publisher.PublishEvent(context.WithoutCancel(ctx), failed); err != nil {
			return fmt.Errorf("publish failed event: %w", err)
		}
		return nil
	}

	result, err := exec.Run(ctx, publisher)
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

	return publishFinished(ctx, publisher, finished)
}

func publishFinished(ctx context.Context, publisher testPublisher, finished event.Finished) error {
	if err := publisher.PublishEvent(context.WithoutCancel(ctx), finished); err != nil {
		return fmt.Errorf("publish finished event: %w", err)
	}
	return nil
}
