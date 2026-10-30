import { testConfigSchema } from './test-config.schema';

const SINGLE_CONFIG = {
    target: { method: 'GET', url: 'https://api.example.com/users' },
    targetRps: 10,
    durationSeconds: 10,
};

const SCENARIO_CONFIG = {
    steps: [{ target: { method: 'GET', url: 'https://api.example.com/users' } }],
};

describe('testConfigSchema', () => {
    it('accepts a single test config', () => {
        expect(testConfigSchema.safeParse({ type: 'single', config: SINGLE_CONFIG }).success).toBe(
            true,
        );
    });

    it('accepts a scenario test config', () => {
        expect(
            testConfigSchema.safeParse({ type: 'scenario', config: SCENARIO_CONFIG }).success,
        ).toBe(true);
    });

    it('rejects a single config nested under type scenario', () => {
        expect(
            testConfigSchema.safeParse({ type: 'scenario', config: SINGLE_CONFIG }).success,
        ).toBe(false);
    });

    it('rejects the batch type', () => {
        expect(testConfigSchema.safeParse({ type: 'batch', config: SINGLE_CONFIG }).success).toBe(
            false,
        );
    });

    it('rejects the round_robin type', () => {
        expect(
            testConfigSchema.safeParse({ type: 'round_robin', config: SINGLE_CONFIG }).success,
        ).toBe(false);
    });
});
