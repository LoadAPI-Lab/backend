package executor

import (
	"context"
	"worker/internal/metrics"
)

type Executor interface {
	Run(ctx context.Context, publisher metrics.Publisher) error
}
