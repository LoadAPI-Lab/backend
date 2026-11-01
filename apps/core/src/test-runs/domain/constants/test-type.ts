export const TestType = {
    SINGLE: 'single',
    SCENARIO: 'scenario',
    BATCH: 'batch',
    ROUND_ROBIN: 'round_robin',
} as const;
export type TestType = (typeof TestType)[keyof typeof TestType];

export const TEST_TYPES = [
    TestType.SINGLE,
    TestType.SCENARIO,
    TestType.BATCH,
    TestType.ROUND_ROBIN,
] as const;
