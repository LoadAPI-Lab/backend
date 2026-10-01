package ratelimiter

import (
	"context"

	"golang.org/x/time/rate"
)

type Limiter struct {
	l *rate.Limiter
}

func New(rps int) *Limiter {
	return &Limiter{l: rate.NewLimiter(rate.Limit(rps), 1)}
}

func (rl *Limiter) Wait(ctx context.Context) error {
	return rl.l.Wait(ctx)
}

func (rl *Limiter) SetRate(rps int) {
	rl.l.SetLimit(rate.Limit(rps))
}
