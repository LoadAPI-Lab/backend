package redis

import (
	"context"
	"fmt"
	"time"

	goredis "github.com/redis/go-redis/v9"
)

const (
	pingTimeout       = 5 * time.Second
	watchSetupTimeout = 2 * time.Second
	stopChannelPrefix = "stop:"
	stoppedKeyPrefix  = "stopped:"
)

type Client struct {
	client *goredis.Client
}

func New(url string) (*Client, error) {
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

	return &Client{client: client}, nil
}

func (p *Client) Publish(ctx context.Context, destination string, body []byte) error {
	return p.client.Publish(ctx, destination, body).Err()
}

func (c *Client) Watch(ctx context.Context, testId string) (context.Context, context.CancelFunc, error) {
	setupCtx, cancelSetup := context.WithTimeout(ctx, watchSetupTimeout)
	defer cancelSetup()

	subscription := c.client.Subscribe(setupCtx, stopChannelPrefix+testId)
	if _, err := subscription.Receive(setupCtx); err != nil {
		subscription.Close()
		return nil, nil, fmt.Errorf("subscribe to stop channel: %w", err)
	}

	stopped, err := c.client.Exists(setupCtx, stoppedKeyPrefix+testId).Result()
	if err != nil {
		subscription.Close()
		return nil, nil, fmt.Errorf("check stop flag: %w", err)
	}

	testCtx, cancel := context.WithCancel(ctx)
	if stopped > 0 {
		cancel()
	}

	messages := subscription.Channel()
	go func() {
		select {
		case <-messages:
			cancel()
		case <-testCtx.Done():
		}
	}()

	stopWatching := func() {
		cancel()
		subscription.Close()
	}
	return testCtx, stopWatching, nil
}

func (p *Client) Close() error {
	return p.client.Close()
}
