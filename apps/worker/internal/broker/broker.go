package broker

import "context"

type Publisher interface {
	Publish(ctx context.Context, destination string, body []byte) error
}

type Consumer interface {
	Receive(ctx context.Context) ([]byte, error)
}

type StopWatcher interface {
	Watch(ctx context.Context, testId string) (context.Context, context.CancelFunc, error)
}
