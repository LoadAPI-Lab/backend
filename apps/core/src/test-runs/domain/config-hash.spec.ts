import { hashTestConfig } from './config-hash';
import { HttpMethod, TestType } from './constants';

const URL = 'https://api.example.com/users';

describe('hashTestConfig', () => {
    it('gives the same hash for equal configs with a different key order', () => {
        const first = hashTestConfig({
            type: TestType.SINGLE,
            config: {
                target: {
                    method: HttpMethod.GET,
                    url: URL,
                    headers: { Accept: '*/*', 'X-Trace': '1' },
                },
                targetRps: 10,
                durationSeconds: 30,
            },
        });
        const second = hashTestConfig({
            config: {
                durationSeconds: 30,
                targetRps: 10,
                target: {
                    headers: { 'X-Trace': '1', Accept: '*/*' },
                    url: URL,
                    method: HttpMethod.GET,
                },
            },
            type: TestType.SINGLE,
        });

        expect(first).toBe(second);
    });

    it('gives a different hash for a different config', () => {
        const config = { target: { method: HttpMethod.GET, url: URL }, durationSeconds: 30 };

        expect(
            hashTestConfig({ type: TestType.SINGLE, config: { ...config, targetRps: 10 } }),
        ).not.toBe(hashTestConfig({ type: TestType.SINGLE, config: { ...config, targetRps: 11 } }));
    });
});
