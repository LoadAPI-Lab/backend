package redis

import (
	"context"
	"fmt"
	"time"

	goredis "github.com/redis/go-redis/v9"
)

const pingTimeout = 5 * time.Second

type Publisher struct {
	client *goredis.Client
}

func New(url string) (*Publisher, error) {
	opts, err := goredis.ParseURL(url)
	if err != nil {
		return nil, fmt.Errorf("parse redis url: %w", err)
	}
	opts.ContextTimeoutEnabled = true

	client := goredis.NewClient(opts)

	ctx, cancel := context.WithTimeout(context.Background(), pingTimeout)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		client.Close()
		return nil, fmt.Errorf("connect to redis at %s: %w", opts.Addr, err)
	}

	return &Publisher{client: client}, nil
}

func (p *Publisher) Publish(ctx context.Context, destination string, body []byte) error {
	return p.client.Publish(ctx, destination, body).Err()
}

func (p *Publisher) Close() error {
	return p.client.Close()
}
