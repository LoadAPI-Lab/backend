package rabbitmq

import (
	"context"
	"fmt"
	"sync"

	amqp "github.com/rabbitmq/amqp091-go"
)

type Publisher struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	mu      sync.Mutex
}

func NewPublisher(url string, queues ...string) (*Publisher, error) {
	conn, channel, err := connect(url, queues...)
	if err != nil {
		return nil, err
	}

	if err := channel.Confirm(false); err != nil {
		conn.Close()
		return nil, fmt.Errorf("enable publisher confirms: %w", err)
	}

	return &Publisher{conn: conn, channel: channel}, nil
}

func (p *Publisher) Publish(ctx context.Context, destination string, body []byte) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	confirmation, err := p.channel.PublishWithDeferredConfirmWithContext(ctx, "", destination, false, false, amqp.Publishing{
		ContentType:  "application/json",
		DeliveryMode: amqp.Persistent,
		Body:         body,
	})
	if err != nil {
		return fmt.Errorf("publish to %s: %w", destination, err)
	}

	acked, err := confirmation.WaitContext(ctx)
	if err != nil {
		return fmt.Errorf("wait for confirmation from %s: %w", destination, err)
	}
	if !acked {
		return fmt.Errorf("rabbitmq rejected message for %s", destination)
	}
	return nil
}

func (p *Publisher) Close() error {
	return p.conn.Close()
}
