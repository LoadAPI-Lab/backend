package rabbitmq

import (
	"fmt"

	amqp "github.com/rabbitmq/amqp091-go"
)

func connect(url string, queues ...string) (*amqp.Connection, *amqp.Channel, error) {
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, nil, fmt.Errorf("connect to rabbitmq: %w", err)
	}

	channel, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, nil, fmt.Errorf("open rabbitmq channel: %w", err)
	}

	for _, queue := range queues {
		if _, err := channel.QueueDeclare(queue, true, false, false, false, nil); err != nil {
			conn.Close()
			return nil, nil, fmt.Errorf("declare queue %s: %w", queue, err)
		}
	}

	return conn, channel, nil
}
