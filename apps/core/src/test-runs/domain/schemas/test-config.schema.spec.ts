import { HttpMethod } from '@shared/constants';

import { TestType } from '../constants';
import { testConfigSchema } from './test-config.schema';

const SINGLE_CONFIG = {
    target: { method: HttpMethod.GET, url: 'https://api.example.com/users' },
    targetRps: 10,
    durationSeconds: 10,
};

const SCENARIO_CONFIG = {
    steps: [{ target: { method: HttpMethod.GET, url: 'https://api.example.com/users' } }],
};

describe('testConfigSchema', () => {
    it('accepts a single test config', () => {
        expect(
            testConfigSchema.safeParse({ type: TestType.SINGLE, config: SINGLE_CONFIG }).success,
        ).toBe(true);
    });

    it('accepts a scenario test config', () => {
        expect(
            testConfigSchema.safeParse({ type: TestType.SCENARIO, config: SCENARIO_CONFIG })
                .success,
        ).toBe(true);
    });

    it('rejects a single config nested under type scenario', () => {
        expect(
            testConfigSchema.safeParse({ type: TestType.SCENARIO, config: SINGLE_CONFIG }).success,
        ).toBe(false);
    });

    it('rejects the batch type', () => {
        expect(
            testConfigSchema.safeParse({ type: TestType.BATCH, config: SINGLE_CONFIG }).success,
        ).toBe(false);
    });

    it('rejects the round_robin type', () => {
        expect(
            testConfigSchema.safeParse({ type: TestType.ROUND_ROBIN, config: SINGLE_CONFIG })
                .success,
        ).toBe(false);
    });
});
