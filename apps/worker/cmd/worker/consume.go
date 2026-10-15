package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"worker/internal/broker"
	"worker/internal/job"
)

func consume(ctx context.Context, jobConsumer broker.Consumer, snapshotPublisher, eventPublisher broker.Publisher) error {
	log.Print("waiting for jobs")

	for {
		body, err := jobConsumer.Receive(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return nil
			}
			return fmt.Errorf("receive job: %w", err)
		}

		var payload job.Payload
		if err := json.Unmarshal(body, &payload); err != nil || payload.TestId == "" {
			log.Printf("skip job: invalid payload: %v", err)
			continue
		}

		log.Printf("test %s: started (%s)", payload.TestId, payload.Type)
		if err := runTest(ctx, payload, snapshotPublisher, eventPublisher); err != nil {
			return err
		}
		log.Printf("test %s: finished", payload.TestId)
	}
}
