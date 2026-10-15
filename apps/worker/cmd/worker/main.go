package main

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"os/signal"
	"syscall"
	"worker/internal/adapter/rabbitmq"
	"worker/internal/adapter/redis"
	"worker/internal/config"

	"github.com/joho/godotenv"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() error {
	if err := godotenv.Load(); err != nil && !errors.Is(err, fs.ErrNotExist) {
		return fmt.Errorf("read .env: %w", err)
	}

	if err := config.Load(); err != nil {
		return fmt.Errorf("invalid configuration: %w", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	snapshotPublisher, err := redis.New(config.Get().RedisURL)
	if err != nil {
		return fmt.Errorf("start snapshot publisher: %w", err)
	}
	defer snapshotPublisher.Close()

	eventPublisher, err := rabbitmq.NewPublisher(config.Get().RabbitMQURL, resultsQueue)
	if err != nil {
		return fmt.Errorf("start event publisher: %w", err)
	}
	defer eventPublisher.Close()

	jobConsumer, err := rabbitmq.NewConsumer(config.Get().RabbitMQURL, jobsQueue)
	if err != nil {
		return fmt.Errorf("start jobs consumer: %w", err)
	}
	defer jobConsumer.Close()

	return consume(ctx, jobConsumer, snapshotPublisher, eventPublisher)
}
