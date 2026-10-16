package rabbitmq

import (
	"context"
	"fmt"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

const pollInterval = 500 * time.Millisecond

type Consumer struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	queue   string
}

func NewConsumer(url, queue string) (*Consumer, error) {
	conn, channel, err := connect(url, queue)
	if err != nil {
		return nil, err
	}

	return &Consumer{conn: conn, channel: channel, queue: queue}, nil
}

func (c *Consumer) Receive(ctx context.Context) ([]byte, error) {
	for {
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		msg, ok, err := c.channel.Get(c.queue, false)
		if err != nil {
			return nil, fmt.Errorf("get from %s: %w", c.queue, err)
		}

		if ok {
			if err := ctx.Err(); err != nil {
				msg.Nack(false, true)
				return nil, err
			}
			if err := msg.Ack(false); err != nil {
				return nil, fmt.Errorf("ack message from %s: %w", c.queue, err)
			}
			return msg.Body, nil
		}

		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(pollInterval):
		}
	}
}

func (c *Consumer) Close() error {
	return c.conn.Close()
}
