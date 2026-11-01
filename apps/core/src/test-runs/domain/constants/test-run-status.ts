export const TestRunStatus = {
    PENDING: 'PENDING',
    RUNNING: 'RUNNING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    STOPPED: 'STOPPED',
} as const;
export type TestRunStatus = (typeof TestRunStatus)[keyof typeof TestRunStatus];

export const TEST_RUN_STATUSES = [
    TestRunStatus.PENDING,
    TestRunStatus.RUNNING,
    TestRunStatus.COMPLETED,
    TestRunStatus.FAILED,
    TestRunStatus.STOPPED,
] as const;

export const ACTIVE_STATUSES = [TestRunStatus.PENDING, TestRunStatus.RUNNING] as const;

export const FINAL_STATUSES = [
    TestRunStatus.COMPLETED,
    TestRunStatus.FAILED,
    TestRunStatus.STOPPED,
] as const;
export type FinalStatus = (typeof FINAL_STATUSES)[number];
