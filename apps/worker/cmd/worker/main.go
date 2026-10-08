package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"worker/internal/adapter/stdout"
	"worker/internal/job"
)

func main() {
	// raw := []byte(`{
	// 	"testId": "demo-1",
	// 	"type": "single",
	// 	"config": {
	// 		"target": {"method": "GET", "url": "https://example.com"},
	// 		"loadProfile": {"targetRps": 5, "durationSeconds": 30}
	// 	}
	// }`)

	raw := []byte(`{
	"testId": "demo-scenario-1",
	"type": "scenario",
	"config": {
		"steps": [
			{
				"target": {
					"method": "POST",
					"url": "https://api.example.com/auth/login",
					"headers": {"Content-Type": "application/json"},
					"body": "{\"email\":\"demo@example.com\",\"password\":\"secret\"}"
				},
				"extract": [{"name": "accessToken", "path": "accessToken"}]
			},
			{
				"target": {
					"method": "POST",
					"url": "https://api.example.com/tasks",
					"headers": {"Content-Type": "application/json", "Authorization": "Bearer {{accessToken}}"},
					"body": "{\"title\":\"task-{{$uuid}}\",\"priority\":{{$randomInt}}}"
				},
				"extract": [{"name": "taskId", "path": "data.id"}]
			},
			{
				"target": {
					"method": "GET",
					"url": "https://api.example.com/tasks/{{taskId}}",
					"headers": {"Authorization": "Bearer {{accessToken}}"}
				}
			},
			{
				"target": {
					"method": "PATCH",
					"url": "https://api.example.com/tasks/{{taskId}}",
					"headers": {"Content-Type": "application/json", "Authorization": "Bearer {{accessToken}}"},
					"body": "{\"status\":\"done\"}"
					}
				}
			]
		}
	}`)

	var payload job.Payload
	if err := json.Unmarshal(raw, &payload); err != nil {
		fmt.Fprintln(os.Stderr, "invalid payload:", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	live := stdout.Publisher{}
	results := stdout.Publisher{}

	if err := runTest(ctx, payload, live, results); err != nil {
		fmt.Fprintln(os.Stderr, "test run failed:", err)
		os.Exit(1)
	}

}
