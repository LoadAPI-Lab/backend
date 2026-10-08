package executor

import (
	"context"
)

type Executor interface {
	Run(ctx context.Context) (any, error)
}
