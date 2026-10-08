package scenario

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"slices"
	"strings"
	"time"
	"worker/internal/extractor"
	"worker/internal/httpclient"
	"worker/internal/job"
	"worker/internal/template"
)

const reqTimeout = 10 * time.Second
const maxResponseBytes = 10 << 20

func New(testId string, cfg Config) *Executor {
	return &Executor{
		testId: testId,
		cfg:    cfg,
		client: httpclient.New(reqTimeout),
	}
}

func (e *Executor) Run(ctx context.Context) (any, error) {
	vars := make(map[string]string)
	results := make([]StepResult, 0, len(e.cfg.Steps))

	for _, step := range e.cfg.Steps {
		if missing := missingVariables(step.Target, vars); len(missing) > 0 {
			results = append(results, StepResult{
				Status:      StepStatusSkipped,
				Description: "undefined variables: " + strings.Join(missing, ", "),
			})
			continue
		}

		target := resolveTarget(step.Target, vars)

		start := time.Now()
		statusCode, respBody, err := e.doRequest(ctx, target)
		durationMs := float64(time.Since(start)) / float64(time.Millisecond)

		if ctx.Err() != nil {
			return results, ctx.Err()
		}
		if err != nil {
			results = append(results, StepResult{
				Status:      StepStatusFailed,
				StatusCode:  statusCode,
				DurationMs:  durationMs,
				Description: err.Error(),
			})
			continue
		}
		if statusCode >= 400 {
			results = append(results, StepResult{
				Status:      StepStatusFailed,
				StatusCode:  statusCode,
				DurationMs:  durationMs,
				Description: fmt.Sprintf("unexpected status %d", statusCode),
			})
			continue
		}
		if err := extractVariables(respBody, step.Extract, vars); err != nil {
			results = append(results, StepResult{
				Status:      StepStatusFailed,
				StatusCode:  statusCode,
				DurationMs:  durationMs,
				Description: err.Error(),
			})
			continue
		}

		results = append(results, StepResult{
			Status:     StepStatusOK,
			StatusCode: statusCode,
			DurationMs: durationMs,
		})
	}

	return results, nil
}

func (e *Executor) doRequest(ctx context.Context, target job.Target) (int, []byte, error) {
	req, err := http.NewRequestWithContext(ctx, target.Method, target.URL, strings.NewReader(target.Body))
	if err != nil {
		return 0, nil, err
	}

	for k, v := range target.Headers {
		req.Header.Set(k, v)
	}

	resp, err := e.client.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, maxResponseBytes))
	if err != nil {
		return resp.StatusCode, nil, err
	}

	return resp.StatusCode, respBody, nil
}

func resolveTarget(target job.Target, vars map[string]string) job.Target {
	headers := make(map[string]string, len(target.Headers))
	for k, v := range target.Headers {
		headers[k] = template.ResolveWithVars(v, vars)
	}

	return job.Target{
		Method:  target.Method,
		URL:     template.ResolveWithVars(target.URL, vars),
		Headers: headers,
		Body:    template.ResolveWithVars(target.Body, vars),
	}
}

func missingVariables(target job.Target, vars map[string]string) []string {
	texts := []string{target.URL, target.Body}
	for _, v := range target.Headers {
		texts = append(texts, v)
	}

	var missing []string
	for _, text := range texts {
		for _, name := range template.VariableNames(text) {
			if _, ok := vars[name]; ok {
				continue
			}
			if slices.Contains(missing, name) {
				continue
			}
			missing = append(missing, name)
		}
	}

	return missing
}

func extractVariables(responseBody []byte, rules []ExtractRule, vars map[string]string) error {
	for _, rule := range rules {
		value, err := extractor.Extract(responseBody, rule.Path)
		if err != nil {
			return fmt.Errorf("extract %q: %w", rule.Name, err)
		}
		vars[rule.Name] = value
	}
	return nil
}
