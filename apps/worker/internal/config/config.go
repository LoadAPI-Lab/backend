package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Env struct {
	MaxWorkers     int
	RequestTimeout time.Duration
	RedisURL       string
	RabbitMQURL    string

	OutboundAllowPrivateNetworks bool
	OutboundAllowedHosts         []string
}

var current = Env{
	MaxWorkers:     10_000,
	RequestTimeout: 10 * time.Second,
	RedisURL:       "redis://localhost:6379/0",
	RabbitMQURL:    "amqp://loadapi:loadapi@localhost:5672/",
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

	allowPrivateNetworks, err := boolFromEnv("OUTBOUND_ALLOW_PRIVATE_NETWORKS", current.OutboundAllowPrivateNetworks)
	if err != nil {
		return err
	}

	current = Env{
		MaxWorkers:     maxWorkers,
		RequestTimeout: requestTimeout,
		RedisURL:       stringFromEnv("REDIS_URL", current.RedisURL),
		RabbitMQURL:    stringFromEnv("RABBITMQ_URL", current.RabbitMQURL),

		OutboundAllowPrivateNetworks: allowPrivateNetworks,
		OutboundAllowedHosts:         hostsFromEnv("OUTBOUND_ALLOWED_HOSTS"),
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

func stringFromEnv(name, fallback string) string {
	if raw := os.Getenv(name); raw != "" {
		return raw
	}
	return fallback
}

func boolFromEnv(name string, fallback bool) (bool, error) {
	raw := os.Getenv(name)
	if raw == "" {
		return fallback, nil
	}

	value, err := strconv.ParseBool(raw)
	if err != nil {
		return false, fmt.Errorf("%s must be true or false, got %q", name, raw)
	}
	return value, nil
}

func hostsFromEnv(name string) []string {
	var hosts []string
	for _, host := range strings.Split(os.Getenv(name), ",") {
		if host = strings.ToLower(strings.TrimSpace(host)); host != "" {
			hosts = append(hosts, host)
		}
	}
	return hosts
}
