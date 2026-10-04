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
		t.Fatalf("timestamp is not a number: %v", err)
	}
	now := time.Now().Unix()
	if got < now-5 || got > now+5 {
		t.Errorf("timestamp = %d, now = %d", got, now)
	}
}

func TestResolveUnique(t *testing.T) {
	for _, placeholder := range []string{"{{$uuid}}", "{{$randomEmail}}"} {
		t.Run(placeholder, func(t *testing.T) {
			seen := make(map[string]bool)
			for i := 0; i < 10_000; i++ {
				v := Resolve(placeholder)
				if seen[v] {
					t.Fatalf("duplicate on iteration %d: %s", i, v)
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
		t.Errorf("unresolved placeholders left: %s", got)
	}
	if !json.Valid([]byte(got)) {
		t.Errorf("result is not valid JSON: %s", got)
	}
}

func TestResolveWithVarsSubstitutes(t *testing.T) {
	vars := map[string]string{
		"taskId":      "42",
		"accessToken": "abc.def",
		"empty":       "",
	}

	tests := []struct {
		name  string
		input string
		want  string
	}{
		{"variable in url", "/tasks/{{taskId}}", "/tasks/42"},
		{"variable in header", "Bearer {{accessToken}}", "Bearer abc.def"},
		{"same variable twice", "{{taskId}}-{{taskId}}", "42-42"},
		{"two variables", "{{taskId}}:{{accessToken}}", "42:abc.def"},
		{"empty value is substituted", "[{{empty}}]", "[]"},
		{"missing variable stays", "/tasks/{{unknown}}", "/tasks/{{unknown}}"},
		{"unknown generator stays", "{{$nope}}", "{{$nope}}"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ResolveWithVars(tt.input, vars)
			if got != tt.want {
				t.Errorf("ResolveWithVars(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestResolveWithVarsMixesGeneratorsAndVariables(t *testing.T) {
	got := ResolveWithVars(`{"taskId":"{{taskId}}","requestId":"{{$uuid}}"}`, map[string]string{"taskId": "42"})

	pattern := `^\{"taskId":"42","requestId":"[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}"\}$`
	if !regexp.MustCompile(pattern).MatchString(got) {
		t.Errorf("got %q, doesn't match %s", got, pattern)
	}
}

func TestResolveWithVarsDoesNotRescanValues(t *testing.T) {
	vars := map[string]string{
		"payload": "{{$uuid}}",
		"other":   "{{taskId}}",
		"taskId":  "42",
	}

	tests := []struct {
		input string
		want  string
	}{
		{"{{payload}}", "{{$uuid}}"},
		{"{{other}}", "{{taskId}}"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got := ResolveWithVars(tt.input, vars)
			if got != tt.want {
				t.Errorf("ResolveWithVars(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestResolveWithVarsNilMap(t *testing.T) {
	input := "/tasks/{{taskId}}"
	if got := ResolveWithVars(input, nil); got != input {
		t.Errorf("ResolveWithVars(%q, nil) = %q, want unchanged", input, got)
	}
}

func TestResolveIgnoresNameEndingWithGenerator(t *testing.T) {
	input := "{{xuuid}}"
	if got := Resolve(input); got != input {
		t.Errorf("Resolve(%q) = %q, want unchanged", input, got)
	}
}
