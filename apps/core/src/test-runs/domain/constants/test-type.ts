export const TEST_TYPES = ['single', 'scenario', 'batch', 'round_robin'] as const;
export type TestType = (typeof TEST_TYPES)[number];
