package neterror

import (
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"runtime"
	"testing"
	"time"
	"worker/internal/config"
	"worker/internal/httpclient"
)

func TestClassify(t *testing.T) {
	client := &http.Client{Timeout: 100 * time.Millisecond}

	tests := []struct {
		name        string
		windowsSkip bool
		request     func(t *testing.T) error
		want        Category
	}{
		{
			name: "timeout",
			request: func(t *testing.T) error {
				server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					time.Sleep(500 * time.Millisecond)
				}))
				t.Cleanup(server.Close)
				_, err := client.Get(server.URL)
				return err
			},
			want: Timeout,
		},
		{
			name: "dns",
			request: func(t *testing.T) error {
				_, err := client.Get("http://nonexistent-host.invalid")
				return err
			},
			want: DNS,
		},
		{
			name:        "connection refused",
			windowsSkip: true,
			request: func(t *testing.T) error {
				listener, err := net.Listen("tcp", "127.0.0.1:0")
				if err != nil {
					t.Fatal(err)
				}
				addr := listener.Addr().String()
				listener.Close()
				_, err = client.Get("http://" + addr)
				return err
			},
			want: ConnectionRefused,
		},
		{
			name: "connection closed without response",
			request: func(t *testing.T) error {
				server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					conn, _, _ := w.(http.Hijacker).Hijack()
					conn.Close()
				}))
				t.Cleanup(server.Close)
				_, err := client.Get(server.URL)
				return err
			},
			want: ConnectionReset,
		},
		{
			name: "blocked",
			request: func(t *testing.T) error {
				t.Setenv("OUTBOUND_ALLOW_PRIVATE_NETWORKS", "false")
				t.Cleanup(func() {
					if err := config.Load(); err != nil {
						t.Error(err)
					}
				})
				if err := config.Load(); err != nil {
					t.Fatal(err)
				}
				server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
				t.Cleanup(server.Close)
				_, err := httpclient.New().Get(server.URL)
				return err
			},
			want: Blocked,
		},
		{
			name: "other",
			request: func(t *testing.T) error {
				return fmt.Errorf("wrapped: %w", errors.New("something unexpected"))
			},
			want: Other,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.windowsSkip && runtime.GOOS == "windows" {
				t.Skip("different OS error codes on Windows")
			}

			err := tt.request(t)
			if err == nil {
				t.Fatal("request succeeded, want error")
			}
			if got := Classify(err); got != tt.want {
				t.Errorf("Classify(%v) = %q, want %q", err, got, tt.want)
			}
		})
	}
}
