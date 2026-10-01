package metrics

import (
	"context"
)

type Publisher interface {
	Publish(ctx context.Context, snapshot Snapshot) error
}
