package redis

import "testing"

func TestHistoryKey(t *testing.T) {
	tests := []struct {
		name    string
		channel string
		key     string
		ok      bool
	}{
		{"snapshot channel", "snapshot:3f2a9c1e-7b4d-4e8a-9c6f-1d2e3f4a5b6c", "snapshot-history:3f2a9c1e-7b4d-4e8a-9c6f-1d2e3f4a5b6c", true},
		{"empty test id", "snapshot:", "", false},
		{"stop channel", "stop:abc", "", false},
		{"prefix not at start", "x-snapshot:abc", "", false},
		{"empty channel", "", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			key, ok := historyKey(tt.channel)
			if key != tt.key || ok != tt.ok {
				t.Errorf("historyKey(%q) = %q, %v; want %q, %v", tt.channel, key, ok, tt.key, tt.ok)
			}
		})
	}
}
