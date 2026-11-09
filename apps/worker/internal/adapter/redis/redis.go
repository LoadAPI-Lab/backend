package redis

import (
	"context"
	"fmt"
	"strings"
	"time"

	goredis "github.com/redis/go-redis/v9"
)

const (
	pingTimeout           = 5 * time.Second
	watchSetupTimeout     = 2 * time.Second
	stopChannelPrefix     = "stop:"
	stoppedKeyPrefix      = "stopped:"
	snapshotChannelPrefix = "snapshot:"
	historyKeyPrefix      = "snapshot-history:"
	historyTTL            = time.Hour
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
	key, ok := historyKey(destination)
	if !ok {
		return p.client.Publish(ctx, destination, body).Err()
	}

	_, err := p.client.TxPipelined(ctx, func(pipe goredis.Pipeliner) error {
		pipe.RPush(ctx, key, body)
		pipe.Expire(ctx, key, historyTTL)
		pipe.Publish(ctx, destination, body)
		return nil
	})
	return err
}

func historyKey(channel string) (string, bool) {
	testId, ok := strings.CutPrefix(channel, snapshotChannelPrefix)
	if !ok || testId == "" {
		return "", false
	}
	return historyKeyPrefix + testId, true
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
