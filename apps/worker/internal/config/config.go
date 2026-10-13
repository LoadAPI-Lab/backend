package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Env struct {
	MaxWorkers     int
	RequestTimeout time.Duration
}

var current = Env{
	MaxWorkers:     10_000,
	RequestTimeout: 10 * time.Second,
}

func Get() Env {
	return current
}

func Load() error {
	maxWorkers, err := intFromEnv("MAX_WORKERS", current.MaxWorkers)
	if err != nil {
		return err
	}

	requestTimeout, err := durationFromEnv("REQUEST_TIMEOUT", current.RequestTimeout)
	if err != nil {
		return err
	}

	current = Env{
		MaxWorkers:     maxWorkers,
		RequestTimeout: requestTimeout,
	}
	return nil
}

func intFromEnv(name string, fallback int) (int, error) {
	raw := os.Getenv(name)
	if raw == "" {
		return fallback, nil
	}

	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return 0, fmt.Errorf("%s must be a positive integer, got %q", name, raw)
	}
	return value, nil
}

func durationFromEnv(name string, fallback time.Duration) (time.Duration, error) {
	raw := os.Getenv(name)
	if raw == "" {
		return fallback, nil
	}

	value, err := time.ParseDuration(raw)
	if err != nil || value <= 0 {
		return 0, fmt.Errorf("%s must be a positive duration like 10s or 500ms, got %q", name, raw)
	}
	return value, nil
}
