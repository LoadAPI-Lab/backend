package scenario

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
	"worker/internal/extractor"
	"worker/internal/httpclient"
	"worker/internal/job"
	"worker/internal/metrics"
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

func (e *Executor) Run(ctx context.Context, publisher metrics.Publisher) error {
	vars := make(map[string]string)

	for _, step := range e.cfg.Steps {
		target := resolveTarget(step.Target, vars)
		respBody, err := e.doRequest(ctx, target)

		if err != nil {
			return err
		}

		for _, rule := range step.Extract {
			v, err := extractor.Extract(respBody, rule.Path)
			if err != nil {
				return fmt.Errorf("extract %q: %w", rule.Name, err)
			}
			vars[rule.Name] = v
		}
	}

	return nil
}

func (e *Executor) doRequest(ctx context.Context, target job.Target) ([]byte, error) {
	body := template.Resolve(target.Body)

	req, err := http.NewRequestWithContext(ctx, target.Method, target.URL, strings.NewReader(body))
	if err != nil {
		return nil, err
	}

	for k, v := range target.Headers {
		req.Header.Set(k, v)
	}

	resp, err := e.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, maxResponseBytes))
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("http %d", resp.StatusCode)
	}

	return respBody, nil
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
