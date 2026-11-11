package httpclient

import (
	"context"
	"errors"
	"net"
	"net/netip"
	"slices"
	"strings"
	"syscall"
	"worker/internal/config"
)

var ErrTargetNotAllowed = errors.New("target address is not allowed")

var blockedPrefixes = []netip.Prefix{
	netip.MustParsePrefix("0.0.0.0/8"),
	netip.MustParsePrefix("10.0.0.0/8"),
	netip.MustParsePrefix("100.64.0.0/10"),
	netip.MustParsePrefix("127.0.0.0/8"),
	netip.MustParsePrefix("169.254.0.0/16"),
	netip.MustParsePrefix("172.16.0.0/12"),
	netip.MustParsePrefix("192.0.0.0/24"),
	netip.MustParsePrefix("192.168.0.0/16"),
	netip.MustParsePrefix("198.18.0.0/15"),
	netip.MustParsePrefix("224.0.0.0/4"),
	netip.MustParsePrefix("240.0.0.0/4"),
	netip.MustParsePrefix("::/128"),
	netip.MustParsePrefix("::1/128"),
	netip.MustParsePrefix("fc00::/7"),
	netip.MustParsePrefix("fe80::/10"),
	netip.MustParsePrefix("ff00::/8"),
}

func blocked(addr netip.Addr) bool {
	addr = addr.Unmap().WithZone("")
	return slices.ContainsFunc(blockedPrefixes, func(prefix netip.Prefix) bool {
		return prefix.Contains(addr)
	})
}

func checkAddress(_, address string, _ syscall.RawConn) error {
	addrPort, err := netip.ParseAddrPort(address)
	if err != nil || blocked(addrPort.Addr()) {
		return ErrTargetNotAllowed
	}
	return nil
}

func guardedDial(dialer *net.Dialer) func(ctx context.Context, network, address string) (net.Conn, error) {
	env := config.Get()
	if env.OutboundAllowPrivateNetworks {
		return dialer.DialContext
	}

	guarded := *dialer
	guarded.Control = checkAddress

	return func(ctx context.Context, network, address string) (net.Conn, error) {
		host, _, err := net.SplitHostPort(address)
		if err == nil && slices.Contains(env.OutboundAllowedHosts, strings.ToLower(host)) {
			return dialer.DialContext(ctx, network, address)
		}
		return guarded.DialContext(ctx, network, address)
	}
}
