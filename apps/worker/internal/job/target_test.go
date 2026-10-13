package job

import "testing"

func TestTargetValidateAccepts(t *testing.T) {
	tests := []struct {
		name   string
		target Target
	}{
		{"simple get", Target{Method: "GET", URL: "https://api.example.com/users"}},
		{"port and query", Target{Method: "POST", URL: "http://localhost:8080/users?page=2"}},
		{"scenario variable in path", Target{Method: "GET", URL: "https://api.example.com/tasks/{{taskId}}"}},
		{"generator in path", Target{Method: "DELETE", URL: "https://api.example.com/tasks/{{$uuid}}"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := tt.target.Validate(); err != nil {
				t.Errorf("Validate() error: %v", err)
			}
		})
	}
}

func TestTargetValidateRejects(t *testing.T) {
	tests := []struct {
		name   string
		target Target
	}{
		{"empty method", Target{Method: "", URL: "https://api.example.com"}},
		{"lowercase method", Target{Method: "get", URL: "https://api.example.com"}},
		{"unknown method", Target{Method: "FETCH", URL: "https://api.example.com"}},
		{"empty url", Target{Method: "GET", URL: ""}},
		{"relative url", Target{Method: "GET", URL: "/users"}},
		{"unsupported scheme", Target{Method: "GET", URL: "ftp://api.example.com/file"}},
		{"no host", Target{Method: "GET", URL: "https:///users"}},
		{"colon path parameter", Target{Method: "GET", URL: "https://api.example.com/users/:id"}},
		{"brace path parameter", Target{Method: "GET", URL: "https://api.example.com/users/{id}/posts"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := tt.target.Validate(); err == nil {
				t.Errorf("Validate() of %+v succeeded, want error", tt.target)
			}
		})
	}
}
