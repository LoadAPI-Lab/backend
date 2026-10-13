package single

import (
	"testing"
	"worker/internal/job"
)

func TestConfigValidate(t *testing.T) {
	target := job.Target{Method: "GET", URL: "https://api.example.com/users"}

	tests := []struct {
		name    string
		cfg     Config
		wantErr bool
	}{
		{"valid", Config{Target: target, TargetRPS: 100, DurationSeconds: 60, RampUpSeconds: 10}, false},
		{"ramp-up equals duration", Config{Target: target, TargetRPS: 100, DurationSeconds: 10, RampUpSeconds: 10}, false},
		{"invalid target", Config{Target: job.Target{Method: "GET", URL: "/users"}, TargetRPS: 100, DurationSeconds: 60}, true},
		{"zero rps", Config{Target: target, TargetRPS: 0, DurationSeconds: 60}, true},
		{"negative rps", Config{Target: target, TargetRPS: -5, DurationSeconds: 60}, true},
		{"zero duration", Config{Target: target, TargetRPS: 100, DurationSeconds: 0}, true},
		{"negative ramp-up", Config{Target: target, TargetRPS: 100, DurationSeconds: 60, RampUpSeconds: -1}, true},
		{"ramp-up longer than test", Config{Target: target, TargetRPS: 100, DurationSeconds: 10, RampUpSeconds: 20}, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.cfg.Validate()
			if tt.wantErr && err == nil {
				t.Error("Validate() succeeded, want error")
			}
			if !tt.wantErr && err != nil {
				t.Errorf("Validate() error: %v", err)
			}
		})
	}
}
