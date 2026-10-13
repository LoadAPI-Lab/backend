package scenario

import (
	"fmt"
	"strings"
)

func (c Config) Validate() error {
	if len(c.Steps) == 0 {
		return fmt.Errorf("scenario has no steps")
	}

	extracted := make(map[string]string)
	for i, step := range c.Steps {
		stepNum := i + 1

		if err := step.Target.Validate(); err != nil {
			return fmt.Errorf("step %d: %w", stepNum, err)
		}

		if missing := missingVariables(step.Target, extracted); len(missing) > 0 {
			return fmt.Errorf("step %d uses variables that no earlier step extracts: %s", stepNum, strings.Join(missing, ", "))
		}

		for _, rule := range step.Extract {
			if rule.Name == "" || rule.Path == "" {
				return fmt.Errorf("step %d: extract rule must have a name and a path", stepNum)
			}
			extracted[rule.Name] = ""
		}
	}

	return nil
}
