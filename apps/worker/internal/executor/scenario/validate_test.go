package scenario

import (
	"testing"
	"worker/internal/job"
)

func TestConfigValidate(t *testing.T) {
	login := Step{
		Target:  job.Target{Method: "POST", URL: "https://api.example.com/login"},
		Extract: []ExtractRule{{Name: "token", Path: "accessToken"}},
	}
	createTask := Step{
		Target: job.Target{
			Method:  "POST",
			URL:     "https://api.example.com/tasks",
			Headers: map[string]string{"Authorization": "Bearer {{token}}"},
			Body:    `{"title":"task-{{$uuid}}"}`,
		},
		Extract: []ExtractRule{{Name: "taskId", Path: "data.id"}},
	}
	getTask := Step{
		Target: job.Target{Method: "GET", URL: "https://api.example.com/tasks/{{taskId}}"},
	}

	tests := []struct {
		name    string
		steps   []Step
		wantErr bool
	}{
		{"valid chain", []Step{login, createTask, getTask}, false},
		{"single step without variables", []Step{login}, false},
		{"no steps", nil, true},
		{"variable used before it is extracted", []Step{getTask, createTask}, true},
		{"variable never extracted", []Step{createTask}, true},
		{"step uses its own extracted variable", []Step{{
			Target:  job.Target{Method: "GET", URL: "https://api.example.com/tasks/{{taskId}}"},
			Extract: []ExtractRule{{Name: "taskId", Path: "id"}},
		}}, true},
		{"extract rule without path", []Step{{
			Target:  job.Target{Method: "GET", URL: "https://api.example.com/me"},
			Extract: []ExtractRule{{Name: "userId"}},
		}}, true},
		{"invalid target in step", []Step{login, {Target: job.Target{Method: "GET", URL: "https://api.example.com/users/:id"}}}, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := Config{Steps: tt.steps}.Validate()
			if tt.wantErr && err == nil {
				t.Error("Validate() succeeded, want error")
			}
			if !tt.wantErr && err != nil {
				t.Errorf("Validate() error: %v", err)
			}
		})
	}
}
