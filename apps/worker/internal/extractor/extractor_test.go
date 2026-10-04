package extractor

import "testing"

func TestExtractSuccess(t *testing.T) {
	tests := []struct {
		name string
		body string
		path string
		want string
	}{
		{"top-level string", `{"accessToken":"abc"}`, "accessToken", "abc"},
		{"nested field", `{"data":{"id":"42"}}`, "data.id", "42"},
		{"number becomes string", `{"data":{"id":42}}`, "data.id", "42"},
		{"big id keeps precision", `{"id":1234567890123456789}`, "id", "1234567890123456789"},
		{"array index", `{"items":[{"id":"a"},{"id":"b"}]}`, "items.1.id", "b"},
		{"root array", `[{"id":"x"}]`, "0.id", "x"},
		{"boolean", `{"done":true}`, "done", "true"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Extract([]byte(tt.body), tt.path)
			if err != nil {
				t.Fatalf("Extract(%s, %q) error: %v", tt.body, tt.path, err)
			}
			if got != tt.want {
				t.Errorf("Extract(%s, %q) = %q, want %q", tt.body, tt.path, got, tt.want)
			}
		})
	}
}

func TestExtractErrors(t *testing.T) {
	tests := []struct {
		name string
		body string
		path string
	}{
		{"not JSON", `not json`, "id"},
		{"empty body", ``, "id"},
		{"missing field", `{"data":{}}`, "data.id"},
		{"index out of range", `{"items":[]}`, "items.0"},
		{"index is not a number", `{"items":[1]}`, "items.first"},
		{"path goes into number", `{"id":42}`, "id.x"},
		{"value is object", `{"data":{"id":1}}`, "data"},
		{"value is null", `{"id":null}`, "id"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Extract([]byte(tt.body), tt.path)
			if err == nil {
				t.Errorf("Extract(%s, %q) = %q, want error", tt.body, tt.path, got)
			}
		})
	}
}
