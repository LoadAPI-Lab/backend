import { MAX_TARGET_RPS } from '../constants';
import { singleConfigSchema } from './single-config.schema';

const TARGET = { method: 'GET', url: 'https://api.example.com/users' };

describe('singleConfigSchema', () => {
    const acceptedCases: { name: string; config: unknown }[] = [
        {
            name: 'valid',
            config: { target: TARGET, targetRps: 100, durationSeconds: 60, rampUpSeconds: 10 },
        },
        {
            name: 'ramp-up equals duration',
            config: { target: TARGET, targetRps: 100, durationSeconds: 10, rampUpSeconds: 10 },
        },
        {
            name: 'rampUpSeconds omitted',
            config: { target: TARGET, targetRps: 100, durationSeconds: 60 },
        },
        {
            name: 'targetRps at the limit',
            config: { target: TARGET, targetRps: MAX_TARGET_RPS, durationSeconds: 60 },
        },
    ];

    const rejectedCases: { name: string; config: unknown }[] = [
        {
            name: 'invalid target',
            config: {
                target: { method: 'GET', url: '/users' },
                targetRps: 100,
                durationSeconds: 60,
            },
        },
        { name: 'zero rps', config: { target: TARGET, targetRps: 0, durationSeconds: 60 } },
        { name: 'negative rps', config: { target: TARGET, targetRps: -5, durationSeconds: 60 } },
        { name: 'zero duration', config: { target: TARGET, targetRps: 100, durationSeconds: 0 } },
        {
            name: 'negative ramp-up',
            config: { target: TARGET, targetRps: 100, durationSeconds: 60, rampUpSeconds: -1 },
        },
        {
            name: 'ramp-up longer than test',
            config: { target: TARGET, targetRps: 100, durationSeconds: 10, rampUpSeconds: 20 },
        },
        {
            name: 'non-integer targetRps',
            config: { target: TARGET, targetRps: 100.5, durationSeconds: 60 },
        },
        {
            name: 'targetRps above the limit',
            config: { target: TARGET, targetRps: MAX_TARGET_RPS + 1, durationSeconds: 60 },
        },
    ];

    for (const { name, config } of acceptedCases) {
        it(`accepts: ${name}`, () => {
            expect(singleConfigSchema.safeParse(config).success).toBe(true);
        });
    }

    for (const { name, config } of rejectedCases) {
        it(`rejects: ${name}`, () => {
            expect(singleConfigSchema.safeParse(config).success).toBe(false);
        });
    }
});
