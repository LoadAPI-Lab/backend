package neterror

import (
	"context"
	"errors"
	"io"
	"net"
	"syscall"
	"worker/internal/httpclient"
)

type Category string

const (
	Timeout           Category = "timeout"
	ConnectionRefused Category = "connection_refused"
	ConnectionReset   Category = "connection_reset"
	DNS               Category = "dns"
	Blocked           Category = "blocked"
	Other             Category = "other"
)

func Classify(err error) Category {
	if errors.Is(err, httpclient.ErrTargetNotAllowed) {
		return Blocked
	}

	var dnsErr *net.DNSError
	if errors.As(err, &dnsErr) {
		return DNS
	}

	var netErr net.Error
	if errors.Is(err, context.DeadlineExceeded) || (errors.As(err, &netErr) && netErr.Timeout()) {
		return Timeout
	}

	if errors.Is(err, syscall.ECONNREFUSED) {
		return ConnectionRefused
	}

	if errors.Is(err, syscall.ECONNRESET) || errors.Is(err, io.EOF) || errors.Is(err, io.ErrUnexpectedEOF) {
		return ConnectionReset
	}

	return Other
}
