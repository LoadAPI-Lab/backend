export const StepStatus = {
    OK: 'OK',
    FAILED: 'FAILED',
    SKIPPED: 'SKIPPED',
} as const;
export type StepStatus = (typeof StepStatus)[keyof typeof StepStatus];

export const STEP_STATUSES = [StepStatus.OK, StepStatus.FAILED, StepStatus.SKIPPED] as const;
