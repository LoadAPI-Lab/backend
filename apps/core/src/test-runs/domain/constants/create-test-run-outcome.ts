export const CreateTestRunOutcome = {
    CREATED: 'CREATED',
    DUPLICATE_ACTIVE: 'DUPLICATE_ACTIVE',
} as const;
export type CreateTestRunOutcome = (typeof CreateTestRunOutcome)[keyof typeof CreateTestRunOutcome];
