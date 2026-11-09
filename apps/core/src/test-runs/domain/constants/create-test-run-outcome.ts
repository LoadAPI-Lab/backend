export const CreateTestRunOutcome = {
    CREATED: 'CREATED',
    IDEMPOTENCY_KEY_CONFLICT: 'IDEMPOTENCY_KEY_CONFLICT',
} as const;
export type CreateTestRunOutcome = (typeof CreateTestRunOutcome)[keyof typeof CreateTestRunOutcome];
