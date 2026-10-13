package job

import (
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"slices"
	"strings"
)

type Target struct {
	Method  string            `json:"method"`
	URL     string            `json:"url"`
	Headers map[string]string `json:"headers,omitempty"`
	Body    string            `json:"body,omitempty"`
}

var allowedMethods = []string{
	http.MethodGet,
	http.MethodPost,
	http.MethodPut,
	http.MethodPatch,
	http.MethodDelete,
	http.MethodHead,
	http.MethodOptions,
}

var pathParamRe = regexp.MustCompile(`^(:\w+|\{\w+\})$`)

func (t Target) Validate() error {
	if !slices.Contains(allowedMethods, t.Method) {
		return fmt.Errorf("unsupported method %q", t.Method)
	}

	u, err := url.Parse(t.URL)
	if err != nil {
		return fmt.Errorf("invalid url %q: %w", t.URL, err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return fmt.Errorf("url %q must start with http:// or https://", t.URL)
	}
	if u.Host == "" {
		return fmt.Errorf("url %q has no host", t.URL)
	}

	for _, segment := range strings.Split(u.Path, "/") {
		if pathParamRe.MatchString(segment) {
			return fmt.Errorf("url %q has unresolved path parameter %q", t.URL, segment)
		}
	}

	return nil
}
