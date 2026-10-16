package main

import (
	"bytes"
	"fmt"
	"net/http"
	"strconv"
	"time"
)

const (
	maxDelay = 60 * time.Second
	maxSize  = 10 << 20
)

var filler = bytes.Repeat([]byte("x"), maxSize)

func handleFixed(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()

	var delay time.Duration
	if raw := query.Get("delay"); raw != "" {
		d, err := time.ParseDuration(raw)
		if err != nil || d < 0 || d > maxDelay {
			http.Error(w, fmt.Sprintf("delay must be a duration from 0 to %s, got %q", maxDelay, raw), http.StatusBadRequest)
			return
		}
		delay = d
	}

	size := 0
	if raw := query.Get("size"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 0 || n > maxSize {
			http.Error(w, fmt.Sprintf("size must be a number of bytes from 0 to %d, got %q", maxSize, raw), http.StatusBadRequest)
			return
		}
		size = n
	}

	select {
	case <-time.After(delay):
	case <-r.Context().Done():
		return
	}

	w.Header().Set("Content-Type", "text/plain")
	w.Header().Set("Content-Length", strconv.Itoa(size))
	w.Write(filler[:size])
}