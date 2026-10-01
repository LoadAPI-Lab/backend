package template

import (
	"encoding/json"
	"regexp"
	"strconv"
	"strings"
	"testing"
	"time"
)

func TestResolveLeavesUnchanged(t *testing.T) {
	tests := []struct {
		name  string
		input string
	}{
		{"without placeholder", `{"title":"load-test"}`},
		{"empty string", ``},
		{"unknown placeholder", `{"x":"{{$nope}}"}`},
		{"varibale without dollar symbol", `/tasks/{{taskId}}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Resolve(tt.input)
			if got != tt.input {
				t.Errorf("Resolve(%q) = %q, want without changes", tt.input, got)
			}
		})
	}
}

func TestResolveFormat(t *testing.T) {
	tests := []struct {
		placeholder string
		pattern     string
	}{
		{"{{$uuid}}", `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`},
		{"{{$randomInt}}", `^[0-9]+$`},
		{"{{$randomEmail}}", `^user_[0-9a-z]+@example\.com$`},
		{"{{$timestamp}}", `^[0-9]+$`},
	}

	for _, tt := range tests {
		t.Run(tt.placeholder, func(t *testing.T) {
			got := Resolve(tt.placeholder)
			if !regexp.MustCompile(tt.pattern).MatchString(got) {
				t.Errorf("Resolve(%q) = %q, doesn't match %s", tt.placeholder, got, tt.pattern)
			}
		})
	}
}

func TestResolveTimestampIsNow(t *testing.T) {
	got, err := strconv.ParseInt(Resolve("{{$timestamp}}"), 10, 64)
	if err != nil {
		t.Fatalf("timestamp не число: %v", err)
	}
	now := time.Now().Unix()
	if got < now-5 || got > now+5 {
		t.Errorf("timestamp = %d, а сейчас %d", got, now)
	}
}

func TestResolveUnique(t *testing.T) {
	for _, placeholder := range []string{"{{$uuid}}", "{{$randomEmail}}"} {
		t.Run(placeholder, func(t *testing.T) {
			seen := make(map[string]bool)
			for i := 0; i < 10_000; i++ {
				v := Resolve(placeholder)
				if seen[v] {
					t.Fatalf("повтор на итерации %d: %s", i, v)
				}
				seen[v] = true
			}
		})
	}
}

func TestResolveKeepsJSONValid(t *testing.T) {
	input := `{"id":"{{$uuid}}","email":"{{$randomEmail}}","age":{{$randomInt}},"ts":{{$timestamp}},"nested":{"id":"{{$uuid}}"}}`

	got := Resolve(input)

	if strings.Contains(got, "{{$") {
		t.Errorf("остались незаменённые плейсхолдеры: %s", got)
	}
	if !json.Valid([]byte(got)) {
		t.Errorf("результат не валидный JSON: %s", got)
	}
}
