package stdout

import (
	"context"
	"fmt"
)

type Publisher struct{}

func (Publisher) Publish(ctx context.Context, destination string, body []byte) error {
	fmt.Printf("[%s] %s\n", destination, body)
	return nil
}
