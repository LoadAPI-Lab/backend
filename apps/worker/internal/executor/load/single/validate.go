package single

import "fmt"

func (c Config) Validate() error {
	if err := c.Target.Validate(); err != nil {
		return err
	}
	if c.TargetRPS <= 0 {
		return fmt.Errorf("targetRps must be greater than 0, got %d", c.TargetRPS)
	}
	if c.DurationSeconds <= 0 {
		return fmt.Errorf("durationSeconds must be greater than 0, got %d", c.DurationSeconds)
	}
	if c.RampUpSeconds < 0 || c.RampUpSeconds > c.DurationSeconds {
		return fmt.Errorf("rampUpSeconds must be between 0 and durationSeconds (%d), got %d", c.DurationSeconds, c.RampUpSeconds)
	}
	return nil
}
