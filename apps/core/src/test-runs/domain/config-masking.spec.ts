import { maskTestRunConfig } from './config-masking';
import { HttpMethod } from './constants';
import type { ScenarioConfig, SingleConfig } from './schemas';

const BEARER_SECRET = 'eyJhbGciOiJIUzI1NiJ9.payload.signature';
const RAW_AUTH_SECRET = 'raw-auth-secret-value';
const COOKIE_SECRET = 'sid=cookie-secret-value; theme=dark';
const API_KEY_SECRET = 'api-key-secret-value';
const CUSTOM_TOKEN_SECRET = 'custom-token-secret-value';
const QUERY_SECRET = 'query-secret-value';
const BASE_URL = 'https://api.example.com/users';

const singleConfig = (
    headers: Record<string, string> | undefined,
    url: string = BASE_URL,
): SingleConfig => ({
    target: { method: HttpMethod.POST, url, ...(headers && { headers }), body: '{"a":1}' },
    targetRps: 10,
    durationSeconds: 30,
});

const maskedTarget = (config: SingleConfig) => {
    const masked = maskTestRunConfig(config);
    if (!('target' in masked)) {
        throw new Error('expected a single config');
    }

    return masked.target;
};

const maskedHeaders = (headers: Record<string, string>) =>
    maskedTarget(singleConfig(headers)).headers;

const maskedUrl = (url: string) => maskedTarget(singleConfig(undefined, url)).url;

describe('maskTestRunConfig', () => {
    it.each([
        {
            title: 'Authorization with Bearer scheme',
            name: 'Authorization',
            value: `Bearer ${BEARER_SECRET}`,
            expected: 'Bearer ***',
        },
        {
            title: 'Authorization without scheme',
            name: 'authorization',
            value: RAW_AUTH_SECRET,
            expected: '***',
        },
        { title: 'Cookie', name: 'Cookie', value: COOKIE_SECRET, expected: '***' },
        { title: 'X-Api-Key', name: 'X-Api-Key', value: API_KEY_SECRET, expected: '***' },
        {
            title: 'a custom header containing token',
            name: 'X-Refresh-Token',
            value: CUSTOM_TOKEN_SECRET,
            expected: '***',
        },
    ])('masks $title', ({ name, value, expected }) => {
        const headers = maskedHeaders({ [name]: value });

        expect(headers).toEqual({ [name]: expected });
        expect(JSON.stringify(headers)).not.toContain(value);
    });

    it.each([
        ['Authorization', 'Bearer {{accessToken}}'],
        ['X-Api-Key', '{{apiKey}}'],
        ['X-Session-Id', '{{$uuid}}'],
    ])('keeps the placeholder-only value of %s', (name, value) => {
        expect(maskedHeaders({ [name]: value })).toEqual({ [name]: value });
    });

    it('keeps non-secret headers', () => {
        const headers = { 'Content-Type': 'application/json', Accept: '*/*' };

        expect(maskedHeaders(headers)).toEqual(headers);
    });

    it('masks the api_key query parameter and keeps the rest of the URL', () => {
        const url = `${BASE_URL}/{{userId}}?page=2&api_key=${QUERY_SECRET}&sort=name#top`;

        expect(maskedUrl(url)).toBe(`${BASE_URL}/{{userId}}?page=2&api_key=***&sort=name#top`);
    });

    it('keeps placeholders in the query as written', () => {
        const url = `${BASE_URL}?access_token={{accessToken}}&q={{$randomInt}}&token=${QUERY_SECRET}`;

        expect(maskedUrl(url)).toBe(
            `${BASE_URL}?access_token={{accessToken}}&q={{$randomInt}}&token=***`,
        );
    });

    it('masks the query of a URL with a placeholder in the host', () => {
        expect(maskedUrl(`http://{{host}}/x?api_key=${QUERY_SECRET}`)).toBe(
            'http://{{host}}/x?api_key=***',
        );
    });

    it('returns a string without a query unchanged', () => {
        const url = 'http://{{host}}/x';

        expect(maskedUrl(url)).toBe(url);
    });

    it('masks the target of every scenario step', () => {
        const config: ScenarioConfig = {
            steps: [
                {
                    target: {
                        method: HttpMethod.POST,
                        url: `${BASE_URL}?secret=${QUERY_SECRET}`,
                        headers: { Authorization: `Bearer ${BEARER_SECRET}` },
                    },
                    extract: [{ name: 'userId', path: 'data.id' }],
                },
                {
                    target: {
                        method: HttpMethod.GET,
                        url: `${BASE_URL}/{{userId}}`,
                        headers: { 'X-Api-Key': API_KEY_SECRET },
                    },
                },
            ],
        };

        const masked = maskTestRunConfig(config);

        expect(masked).toEqual({
            steps: [
                {
                    target: {
                        method: HttpMethod.POST,
                        url: `${BASE_URL}?secret=***`,
                        headers: { Authorization: 'Bearer ***' },
                    },
                    extract: [{ name: 'userId', path: 'data.id' }],
                },
                {
                    target: {
                        method: HttpMethod.GET,
                        url: `${BASE_URL}/{{userId}}`,
                        headers: { 'X-Api-Key': '***' },
                    },
                },
            ],
        });
        const serialized = JSON.stringify(masked);
        for (const secret of [QUERY_SECRET, BEARER_SECRET, API_KEY_SECRET]) {
            expect(serialized).not.toContain(secret);
        }
    });

    it('does not mutate the input config', () => {
        const config = singleConfig(
            { Authorization: `Bearer ${BEARER_SECRET}`, Cookie: COOKIE_SECRET },
            `${BASE_URL}?api_key=${QUERY_SECRET}`,
        );
        const snapshot = structuredClone(config);

        const masked = maskTestRunConfig(config);

        expect(config).toEqual(snapshot);
        expect(masked).toMatchObject({ target: { headers: { Cookie: '***' } } });
        expect(config.target.headers).toMatchObject({ Cookie: COOKIE_SECRET });
    });
});
