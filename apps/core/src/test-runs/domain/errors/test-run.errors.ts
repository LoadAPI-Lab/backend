import { ErrorCode } from '@shared/error';

export const TestRunErrorCodes = {
    ENQUEUE_FAILED: 'TEST_RUN.ENQUEUE_FAILED',
    NOT_FOUND: 'TEST_RUN.NOT_FOUND',
    ALREADY_FINISHED: 'TEST_RUN.ALREADY_FINISHED',
    CAPACITY_EXCEEDED: 'TEST_RUN.CAPACITY_EXCEEDED',
    INVALID_CURSOR: ErrorCode.VALIDATION_FAILED,
} as const;

export type TestRunErrorCode = (typeof TestRunErrorCodes)[keyof typeof TestRunErrorCodes];

export const TestRunErrorMessages: Record<TestRunErrorCode, string> = {
    [TestRunErrorCodes.ENQUEUE_FAILED]: 'Failed to enqueue the test job',
    [TestRunErrorCodes.NOT_FOUND]: 'Test run not found',
    [TestRunErrorCodes.ALREADY_FINISHED]: 'Test run has already finished',
    [TestRunErrorCodes.CAPACITY_EXCEEDED]: 'Too many test runs are in progress, try again later',
    [TestRunErrorCodes.INVALID_CURSOR]: 'The pagination cursor is invalid',
};
