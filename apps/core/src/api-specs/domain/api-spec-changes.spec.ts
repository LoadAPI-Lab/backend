import { summarizeEndpointChanges } from './api-spec-changes';
import type { ApiSpecEndpoint } from './api-spec-document';
import { ApiSpecMethod, ParameterLocation } from './constants';

type EndpointOverrides = Partial<Omit<ApiSpecEndpoint, 'id' | 'key' | 'method' | 'path'>>;

const endpoint = (
    method: ApiSpecMethod,
    path: string,
    overrides: EndpointOverrides = {},
): ApiSpecEndpoint => ({
    id: `${method}${path}`,
    key: `${method} ${path}`,
    method,
    path,
    tags: [],
    parameters: [],
    responses: [{ status: '200', description: 'OK' }],
    ...overrides,
});

describe('summarizeEndpointChanges', () => {
    it('detects added, changed and removed endpoints', () => {
        const previous = [
            endpoint(ApiSpecMethod.GET, '/orders'),
            endpoint(ApiSpecMethod.DELETE, '/orders/{id}'),
            endpoint(ApiSpecMethod.GET, '/users'),
        ];
        const next = [
            endpoint(ApiSpecMethod.GET, '/orders', {
                responses: [{ status: '201', description: 'Created' }],
            }),
            endpoint(ApiSpecMethod.GET, '/users'),
            endpoint(ApiSpecMethod.POST, '/orders'),
        ];

        expect(summarizeEndpointChanges(previous, next)).toEqual({
            added: ['POST /orders'],
            changed: ['GET /orders'],
            removed: ['DELETE /orders/{id}'],
        });
    });

    it('detects changed parameters and request bodies', () => {
        const previous = [
            endpoint(ApiSpecMethod.GET, '/orders'),
            endpoint(ApiSpecMethod.POST, '/orders'),
        ];
        const next = [
            endpoint(ApiSpecMethod.GET, '/orders', {
                parameters: [
                    { name: 'limit', in: ParameterLocation.QUERY, required: false, schema: {} },
                ],
            }),
            endpoint(ApiSpecMethod.POST, '/orders', {
                requestBody: { required: true, contentType: 'application/json' },
            }),
        ];

        expect(summarizeEndpointChanges(previous, next).changed).toEqual([
            'GET /orders',
            'POST /orders',
        ]);
    });

    it('does not treat objects with the same values in a different key order as changed', () => {
        const previous = [
            endpoint(ApiSpecMethod.POST, '/orders', {
                parameters: [
                    {
                        name: 'limit',
                        in: ParameterLocation.QUERY,
                        required: false,
                        schema: { type: 'integer', default: 10 },
                    },
                ],
                requestBody: { required: true, contentType: 'application/json', example: '{}' },
                responses: [{ status: '200', description: 'OK' }],
            }),
        ];
        const next = [
            endpoint(ApiSpecMethod.POST, '/orders', {
                responses: [{ description: 'OK', status: '200' }],
                requestBody: { example: '{}', contentType: 'application/json', required: true },
                parameters: [
                    {
                        schema: { default: 10, type: 'integer' },
                        required: false,
                        in: ParameterLocation.QUERY,
                        name: 'limit',
                    },
                ],
            }),
        ];

        expect(summarizeEndpointChanges(previous, next)).toEqual({
            added: [],
            changed: [],
            removed: [],
        });
    });

    it('ignores changes of summary, description, tags and deprecated', () => {
        const previous = [endpoint(ApiSpecMethod.GET, '/orders', { summary: 'List', tags: ['a'] })];
        const next = [
            endpoint(ApiSpecMethod.GET, '/orders', {
                summary: 'List orders',
                description: 'Lists all orders',
                tags: ['b'],
                deprecated: true,
            }),
        ];

        expect(summarizeEndpointChanges(previous, next).changed).toEqual([]);
    });

    it('orders added and changed by the new document and removed by the old document', () => {
        const previous = [
            endpoint(ApiSpecMethod.GET, '/b'),
            endpoint(ApiSpecMethod.GET, '/x'),
            endpoint(ApiSpecMethod.GET, '/a'),
            endpoint(ApiSpecMethod.GET, '/y'),
        ];
        const changedResponses = { responses: [] };
        const next = [
            endpoint(ApiSpecMethod.GET, '/d'),
            endpoint(ApiSpecMethod.GET, '/a', changedResponses),
            endpoint(ApiSpecMethod.GET, '/c'),
            endpoint(ApiSpecMethod.GET, '/b', changedResponses),
        ];

        expect(summarizeEndpointChanges(previous, next)).toEqual({
            added: ['GET /d', 'GET /c'],
            changed: ['GET /a', 'GET /b'],
            removed: ['GET /x', 'GET /y'],
        });
    });
});
