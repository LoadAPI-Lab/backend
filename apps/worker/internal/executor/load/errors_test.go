package load

import (
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"runtime"
	"testing"
	"time"
)

func TestClassifyError(t *testing.T) {
	client := &http.Client{Timeout: 100 * time.Millisecond}

	tests := []struct {
		name        string
		windowsSkip bool
		request     func(t *testing.T) error
		want        NetworkError
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
			want: ErrorTimeout,
		},
		{
			name: "dns",
			request: func(t *testing.T) error {
				_, err := client.Get("http://nonexistent-host.invalid")
				return err
			},
			want: ErrorDNS,
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
			want: ErrorConnectionRefused,
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
			want: ErrorConnectionReset,
		},
		{
			name: "other",
			request: func(t *testing.T) error {
				return fmt.Errorf("wrapped: %w", errors.New("something unexpected"))
			},
			want: ErrorOther,
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
			if got := ClassifyError(err); got != tt.want {
				t.Errorf("ClassifyError(%v) = %q, want %q", err, got, tt.want)
			}
		})
	}
}
