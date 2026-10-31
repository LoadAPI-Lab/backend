export const TestRunErrorCodes = {
    ENQUEUE_FAILED: 'TEST_RUN.ENQUEUE_FAILED',
} as const;

export type TestRunErrorCode = (typeof TestRunErrorCodes)[keyof typeof TestRunErrorCodes];

export const TestRunErrorMessages: Record<TestRunErrorCode, string> = {
    [TestRunErrorCodes.ENQUEUE_FAILED]: 'Failed to enqueue the test job',
};
