package load

import (
	"context"
	"errors"
	"io"
	"net"
	"syscall"
)

func ClassifyError(err error) NetworkError {
	var dnsErr *net.DNSError
	if errors.As(err, &dnsErr) {
		return ErrorDNS
	}

	var netErr net.Error
	if errors.Is(err, context.DeadlineExceeded) || (errors.As(err, &netErr) && netErr.Timeout()) {
		return ErrorTimeout
	}

	if errors.Is(err, syscall.ECONNREFUSED) {
		return ErrorConnectionRefused
	}

	if errors.Is(err, syscall.ECONNRESET) || errors.Is(err, io.EOF) || errors.Is(err, io.ErrUnexpectedEOF) {
		return ErrorConnectionReset
	}

	return ErrorOther
}
