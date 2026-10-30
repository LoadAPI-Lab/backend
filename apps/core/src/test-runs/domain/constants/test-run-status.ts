export const TEST_RUN_STATUSES = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'STOPPED'] as const;
export type TestRunStatus = (typeof TEST_RUN_STATUSES)[number];

export const FINAL_STATUSES = ['COMPLETED', 'FAILED', 'STOPPED'] as const;
export type FinalStatus = (typeof FINAL_STATUSES)[number];
