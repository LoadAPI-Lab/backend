package main

import (
	"fmt"
	"os"
	"time"
)

type config struct {
	stallEvery time.Duration
	stallFor   time.Duration
}

func loadConfig() (config, error) {
	every, err := durationFromEnv("STALL_EVERY")
	if err != nil {
		return config{}, err
	}
	stallFor, err := durationFromEnv("STALL_FOR")
	if err != nil {
		return config{}, err
	}

	if (every == 0) != (stallFor == 0) {
		return config{}, fmt.Errorf("STALL_EVERY and STALL_FOR must be set together")
	}
	if every > 0 && stallFor >= every {
		return config{}, fmt.Errorf("STALL_FOR (%s) must be shorter than STALL_EVERY (%s)", stallFor, every)
	}

	return config{stallEvery: every, stallFor: stallFor}, nil
}

func durationFromEnv(name string) (time.Duration, error) {
	raw := os.Getenv(name)
	if raw == "" {
		return 0, nil
	}
	value, err := time.ParseDuration(raw)
	if err != nil || value <= 0 {
		return 0, fmt.Errorf("%s must be a positive duration like 30s, got %q", name, raw)
	}
	return value, nil
}
