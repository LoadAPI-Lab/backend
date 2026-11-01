export const TestRunFailureReason = {
    NO_WORKER: 'no worker picked up the job in time',
    RESULT_NOT_REPORTED: 'the worker did not report the result in time',
} as const;
export type TestRunFailureReason = (typeof TestRunFailureReason)[keyof typeof TestRunFailureReason];
