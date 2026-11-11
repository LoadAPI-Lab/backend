package httpclient

import (
	"errors"
	"net"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"sync/atomic"
	"testing"
	"worker/internal/config"
)

func TestBlocked(t *testing.T) {
	tests := []struct {
		addr string
		want bool
	}{
		{addr: "127.0.0.1", want: true},
		{addr: "10.1.2.3", want: true},
		{addr: "172.20.0.5", want: true},
		{addr: "192.168.1.1", want: true},
		{addr: "169.254.169.254", want: true},
		{addr: "100.64.0.1", want: true},
		{addr: "0.0.0.0", want: true},
		{addr: "::1", want: true},
		{addr: "fd00::1", want: true},
		{addr: "fe80::1", want: true},
		{addr: "::ffff:127.0.0.1", want: true},
		{addr: "93.184.216.34", want: false},
		{addr: "2606:4700::1111", want: false},
	}

	for _, tt := range tests {
		t.Run(tt.addr, func(t *testing.T) {
			if got := blocked(netip.MustParseAddr(tt.addr)); got != tt.want {
				t.Errorf("blocked(%s) = %v, want %v", tt.addr, got, tt.want)
			}
		})
	}
}

func TestClientOutboundPolicy(t *testing.T) {
	tests := []struct {
		name                 string
		allowPrivateNetworks string
		allowedHosts         string
		host                 string
		wantBlocked          bool
	}{
		{
			name:                 "loopback address denied",
			allowPrivateNetworks: "false",
			host:                 "127.0.0.1",
			wantBlocked:          true,
		},
		{
			name:                 "localhost denied",
			allowPrivateNetworks: "false",
			host:                 "localhost",
			wantBlocked:          true,
		},
		{
			name:                 "localhost in allowed hosts",
			allowPrivateNetworks: "false",
			allowedHosts:         "example.com, LocalHost",
			host:                 "localhost",
		},
		{
			name:                 "private networks allowed",
			allowPrivateNetworks: "true",
			host:                 "localhost",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			loadConfig(t, tt.allowPrivateNetworks, tt.allowedHosts)

			var connections atomic.Int32
			server := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
			server.Config.ConnState = func(_ net.Conn, state http.ConnState) {
				if state == http.StateNew {
					connections.Add(1)
				}
			}
			server.Start()
			t.Cleanup(server.Close)

			_, port, err := net.SplitHostPort(server.Listener.Addr().String())
			if err != nil {
				t.Fatal(err)
			}

			resp, err := New().Get("http://" + net.JoinHostPort(tt.host, port))
			if !tt.wantBlocked {
				if err != nil {
					t.Fatalf("request failed: %v", err)
				}
				resp.Body.Close()
				return
			}

			if !errors.Is(err, ErrTargetNotAllowed) {
				t.Fatalf("error = %v, want %v", err, ErrTargetNotAllowed)
			}
			server.Close()
			if got := connections.Load(); got != 0 {
				t.Errorf("server received %d connections, want 0", got)
			}
		})
	}
}

func loadConfig(t *testing.T, allowPrivateNetworks, allowedHosts string) {
	t.Helper()
	t.Cleanup(func() {
		if err := config.Load(); err != nil {
			t.Error(err)
		}
	})
	t.Setenv("OUTBOUND_ALLOW_PRIVATE_NETWORKS", allowPrivateNetworks)
	t.Setenv("OUTBOUND_ALLOWED_HOSTS", allowedHosts)
	if err := config.Load(); err != nil {
		t.Fatal(err)
	}
}
