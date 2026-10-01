package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"worker/internal/executor"
	"worker/internal/job"
	"worker/internal/metrics"
)

func main() {
	raw := []byte(`{
		"testId": "demo-1",
		"type": "single",
		"config": {
			"target": {"method": "GET", "url": "https://example.com"},
			"loadProfile": {"targetRps": 5, "durationSeconds": 30}
		}
	}`)

	var payload job.Payload
	if err := json.Unmarshal(raw, &payload); err != nil {
		fmt.Fprintln(os.Stderr, "invalid payload:", err)
		os.Exit(1)
	}

	exec, err := executor.New(payload)
	if err != nil {
		fmt.Fprintln(os.Stderr, "cannot build executor:", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := exec.Run(ctx, stdoutPublisher{}); err != nil {
		fmt.Fprintln(os.Stderr, "test run failed:", err)
		os.Exit(1)
	}
}

type stdoutPublisher struct{}

func (stdoutPublisher) Publish(ctx context.Context, snapshot metrics.Snapshot) error {
	fmt.Printf("[metrics] %+v\n", snapshot)
	return nil
}
