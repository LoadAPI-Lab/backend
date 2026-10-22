package main

import (
	"context"
	"fmt"
	"math/rand/v2"
	"net/http"
	"strconv"
	"time"
)

const (
	maxDelay = 60 * time.Second
	maxSize  = 1 << 20
)

var filler = func() []byte {
	b := make([]byte, maxSize)
	for i := range b {
		b[i] = 'x'
	}
	return b
}()

func handleFixed(w http.ResponseWriter, r *http.Request) {
	delay, err := parseDelay(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	size := 0
	if raw := r.URL.Query().Get("size"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 0 || n > maxSize {
			http.Error(w, fmt.Sprintf("size must be a number of bytes from 0 to %d, got %q", maxSize, raw), http.StatusBadRequest)
			return
		}
		size = n
	}

	if !wait(r.Context(), delay) {
		return
	}

	w.Header().Set("Content-Type", "text/plain")
	w.Header().Set("Content-Length", strconv.Itoa(size))
	w.Write(filler[:size])
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	raw := r.PathValue("code")
	code, err := strconv.Atoi(raw)
	if err != nil || code < 200 || code > 599 {
		http.Error(w, fmt.Sprintf("status code must be a number from 200 to 599, got %q", raw), http.StatusBadRequest)
		return
	}
	w.WriteHeader(code)
}

func handleFlaky(w http.ResponseWriter, r *http.Request) {
	delay, err := parseDelay(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	rate := 0.0
	if raw := r.URL.Query().Get("errorRate"); raw != "" {
		value, err := strconv.ParseFloat(raw, 64)
		if err != nil || value < 0 || value > 1 {
			http.Error(w, fmt.Sprintf("errorRate must be a number from 0 to 1, got %q", raw), http.StatusBadRequest)
			return
		}
		rate = value
	}

	if !wait(r.Context(), delay) {
		return
	}

	if rand.Float64() < rate {
		w.WriteHeader(http.StatusInternalServerError)
	}
}

func parseDelay(r *http.Request) (time.Duration, error) {
	raw := r.URL.Query().Get("delay")
	if raw == "" {
		return 0, nil
	}
	d, err := time.ParseDuration(raw)
	if err != nil || d < 0 || d > maxDelay {
		return 0, fmt.Errorf("delay must be a duration from 0 to %s, got %q", maxDelay, raw)
	}
	return d, nil
}

func wait(ctx context.Context, d time.Duration) bool {
	if d <= 0 {
		return true
	}
	timer := time.NewTimer(d)
	defer timer.Stop()

	select {
	case <-timer.C:
		return true
	case <-ctx.Done():
		return false
	}
}
