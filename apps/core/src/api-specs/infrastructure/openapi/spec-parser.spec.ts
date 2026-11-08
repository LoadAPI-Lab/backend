import fs from 'node:fs';

import { BaseException, type ErrorDetail, type IErrorOptions } from '@shared/error';

import type { ApiSpecEndpoint } from '../../domain/api-spec-document';
import { ENDPOINT_ID_LENGTH, MAX_SPEC_SIZE_BYTES } from '../../domain/constants';
import { ApiSpecErrorCodes } from '../../domain/errors';
import { SpecParserImpl } from './spec-parser';

const HEADER = ['info:', '  title: Shop', '  version: 1.0.0'];

const openapi30 = (...lines: string[]): string =>
    ['openapi: 3.0.3', ...HEADER, ...lines].join('\n');

const openapi31 = (...lines: string[]): string =>
    ['openapi: 3.1.0', ...HEADER, ...lines].join('\n');

const getOperation = (...lines: string[]): string[] => [
    'paths:',
    '  /orders:',
    '    get:',
    ...lines.map((line) => `      ${line}`),
    '      responses:',
    "        '200':",
    '          description: OK',
];

const COMPONENTS = [
    'components:',
    '  schemas:',
    '    OrderLine:',
    '      type: object',
    '      properties:',
    '        productId: { type: string, format: uuid }',
    '        quantity: { type: integer }',
    '    Credentials:',
    '      type: object',
    '      properties:',
    '        a: { type: string, example: text }',
    '        b: { type: integer, example: 3 }',
    '    Order:',
    '      type: object',
    '      properties:',
    '        id: { type: string, readOnly: true }',
    '        note: { type: string }',
    '    Node:',
    '      type: object',
    '      properties:',
    '        name: { type: string }',
    '        children:',
    '          type: array',
    '          items: { $ref: "#/components/schemas/Node" }',
];

const withRequestBody = (body: string[]): string =>
    openapi30(
        'paths:',
        '  /orders:',
        '    post:',
        '      requestBody:',
        ...body.map((line) => `        ${line}`),
        '      responses:',
        "        '201': { description: Created }",
        ...COMPONENTS,
    );

interface ParseFailure {
    readonly status: number;
    readonly code: string;
    readonly details: ErrorDetail[];
}

const parser = new SpecParserImpl();

const failureOf = async (content: string): Promise<ParseFailure> => {
    const outcome: unknown = await parser
        .parse(content)
        .then(() => new Error('Expected the parser to reject'))
        .catch((error: unknown) => error);
    if (!(outcome instanceof BaseException)) {
        throw new Error('Expected the parser to reject with a BaseException');
    }
    const response = outcome.getResponse() as IErrorOptions;
    return {
        status: outcome.getStatus(),
        code: response.code,
        details: (response.details ?? []) as ErrorDetail[],
    };
};

const describeRejection = (error: unknown): never => {
    const response = error instanceof BaseException ? error.getResponse() : error;
    throw new Error(`Expected the document to parse: ${JSON.stringify(response)}`);
};

const firstEndpoint = async (content: string): Promise<ApiSpecEndpoint> => {
    const { endpoints } = await parser.parse(content).catch(describeRejection);
    const [endpoint] = endpoints;
    if (!endpoint) {
        throw new Error('Expected at least one endpoint');
    }
    return endpoint;
};

describe('SpecParserImpl', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('rejects a document above the size limit as too large', async () => {
        const content = openapi30('paths: {}', `x-padding: ${'a'.repeat(MAX_SPEC_SIZE_BYTES)}`);

        await expect(failureOf(content)).resolves.toMatchObject({
            status: 413,
            code: ApiSpecErrorCodes.TOO_LARGE,
        });
    });

    it.each([
        {
            name: 'YAML',
            content: 'openapi: 3.0.3\ninfo:\n  title: a: b\n',
            line: 3,
            column: 10,
        },
        {
            name: 'JSON',
            content: '{\n  "openapi": "3.0.3",\n  "info": {\n    "title": "Shop",,\n  }\n}',
            line: 4,
            column: 21,
        },
    ])('reports a $name syntax error with line and column', async ({ content, line, column }) => {
        const failure = await failureOf(content);

        expect(failure).toMatchObject({ status: 400, code: ApiSpecErrorCodes.INVALID_SYNTAX });
        expect(failure.details).toHaveLength(1);
        expect(failure.details[0]).toMatchObject({
            field: 'content',
            code: 'yaml_syntax',
            line,
            column,
        });
        expect(failure.details[0]?.message).toEqual(expect.any(String));
    });

    it.each([
        { name: 'a list', content: '- openapi: 3.0.3' },
        { name: 'a scalar', content: 'just text' },
    ])('rejects a root that is $name as invalid', async ({ content }) => {
        await expect(failureOf(content)).resolves.toMatchObject({
            code: ApiSpecErrorCodes.INVALID,
            details: [{ field: 'content', code: 'invalid_spec' }],
        });
    });

    it.each([
        {
            name: 'Swagger 2.0',
            content: 'swagger: "2.0"\ninfo:\n  title: a\n  version: "1"\npaths: {}',
        },
        { name: 'OpenAPI 3.2', content: ['openapi: 3.2.0', ...HEADER, 'paths: {}'].join('\n') },
        { name: 'a numeric version', content: ['openapi: 3.0', ...HEADER, 'paths: {}'].join('\n') },
        { name: 'no openapi field', content: [...HEADER, 'paths: {}'].join('\n') },
    ])('rejects $name as an unsupported version', async ({ content }) => {
        await expect(failureOf(content)).resolves.toMatchObject({
            status: 400,
            code: ApiSpecErrorCodes.UNSUPPORTED_VERSION,
        });
    });

    it('rejects an invalid document with a dot path to the problem', async () => {
        const content = openapi30('paths:', '  /orders:', '    post:', '      responses: 5');

        const failure = await failureOf(content);

        expect(failure.code).toBe(ApiSpecErrorCodes.INVALID);
        expect(failure.details).toContainEqual(
            expect.objectContaining({
                field: 'paths./orders.post.responses',
                code: 'invalid_spec',
            }),
        );
        expect(failure.details.every((detail) => detail.line === undefined)).toBe(true);
    });

    it.each([
        { name: 'a file URL', ref: 'file:///etc/passwd' },
        { name: 'a metadata endpoint URL', ref: 'http://169.254.169.254/latest' },
    ])('rejects an external $ref to $name without fetching it', async ({ ref }) => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        const readFileSpy = vi.spyOn(fs, 'readFile');
        const readFileSyncSpy = vi.spyOn(fs, 'readFileSync');
        const readFilePromiseSpy = vi.spyOn(fs.promises, 'readFile');
        const content = openapi30(...getOperation('parameters:', `  - $ref: '${ref}'`));

        const failure = await failureOf(content);

        expect(failure.code).toBe(ApiSpecErrorCodes.INVALID);
        expect(failure.details).toEqual([
            expect.objectContaining({
                field: 'paths./orders.get.parameters.0.$ref',
                code: 'invalid_spec',
            }),
        ]);
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(readFileSpy).not.toHaveBeenCalled();
        expect(readFileSyncSpy).not.toHaveBeenCalled();
        expect(readFilePromiseSpy).not.toHaveBeenCalled();
    });

    it('parses a document with circular schema references', async () => {
        const content = openapi30(
            ...getOperation(
                'parameters:',
                '  - name: filter',
                '    in: query',
                '    schema:',
                "      $ref: '#/components/schemas/Node'",
            ),
            'components:',
            '  schemas:',
            '    Node:',
            '      type: object',
            '      properties:',
            '        child:',
            "          $ref: '#/components/schemas/Node'",
        );

        const endpoint = await firstEndpoint(content);

        expect(endpoint.parameters).toEqual([
            { name: 'filter', in: 'query', required: false, schema: { type: 'object' } },
        ]);
    }, 5000);

    it('rejects recursive YAML aliases as a syntax error', async () => {
        await expect(
            failureOf(openapi30('x-loop: &loop', '  self: *loop', 'paths: {}')),
        ).resolves.toMatchObject({
            code: ApiSpecErrorCodes.INVALID_SYNTAX,
        });
    });

    it('returns the document metadata', async () => {
        const spec = await parser.parse(
            [
                'openapi: 3.1.0',
                'info:',
                '  title: Shop',
                '  version: 2.1.0',
                '  description: Orders',
                'paths: {}',
            ].join('\n'),
        );

        expect(spec).toEqual({
            title: 'Shop',
            version: '2.1.0',
            description: 'Orders',
            servers: [],
            endpoints: [],
        });
    });

    it.each([
        {
            name: 'variables substituted with their defaults',
            servers: [
                'servers:',
                '  - url: https://{region}.example.com/{base}',
                '    variables:',
                '      region:',
                '        default: eu',
                '        enum: [eu, us]',
                '        description: Region',
                '      base:',
                '        default: v1',
            ],
            expected: [
                {
                    url: 'https://eu.example.com/v1',
                    template: 'https://{region}.example.com/{base}',
                    variables: {
                        region: { default: 'eu', enum: ['eu', 'us'], description: 'Region' },
                        base: { default: 'v1' },
                    },
                },
            ],
        },
        {
            name: 'relative URLs marked as relative, in document order',
            servers: ['servers:', '  - url: /api', '  - url: https://api.example.com'],
            expected: [{ url: '/api', relative: true }, { url: 'https://api.example.com' }],
        },
        {
            name: 'no servers as an empty list',
            servers: [],
            expected: [],
        },
    ])('returns servers with $name', async ({ servers, expected }) => {
        const spec = await parser.parse(openapi30(...servers, 'paths: {}'));

        expect(spec.servers).toEqual(expected);
    });

    it('returns endpoints in document order and skips trace', async () => {
        const content = openapi31(
            'paths:',
            '  /orders:',
            '    post:',
            '      responses:',
            "        '201': { description: Created }",
            '    trace:',
            '      responses:',
            "        '200': { description: OK }",
            '    get:',
            '      summary: List orders',
            '      tags: [orders]',
            '      deprecated: true',
            '      responses:',
            "        '200': { description: OK }",
            '  /health:',
            '    get:',
            '      deprecated: false',
            '      responses:',
            '        default: { description: Error }',
            "        '503': { description: Down }",
            "        '200': { description: Up }",
        );

        const { endpoints } = await parser.parse(content);

        expect(endpoints.map((endpoint) => endpoint.key)).toEqual([
            'POST /orders',
            'GET /orders',
            'GET /health',
        ]);
        expect(endpoints[1]).toMatchObject({
            method: 'GET',
            path: '/orders',
            summary: 'List orders',
            tags: ['orders'],
            deprecated: true,
        });
        expect(endpoints[0]?.tags).toEqual([]);
        expect(endpoints[2]).not.toHaveProperty('deprecated');
        expect(endpoints[2]?.responses).toEqual([
            { status: 'default', description: 'Error' },
            { status: '503', description: 'Down' },
            { status: '200', description: 'Up' },
        ]);
    });

    it('merges path-level parameters and lets the operation override them', async () => {
        const content = openapi30(
            'paths:',
            '  /orders/{id}:',
            '    parameters:',
            '      - name: id',
            '        in: path',
            '        required: true',
            '        schema: { type: string }',
            '      - name: X-Tenant',
            '        in: header',
            '        description: Path-level tenant',
            '        schema: { type: string }',
            '    get:',
            '      parameters:',
            '        - name: x-tenant',
            '          in: header',
            '          required: true',
            '          description: Operation tenant',
            '          schema: { type: string, format: uuid }',
            '        - name: expand',
            '          in: query',
            '          schema: { type: string, enum: [items, customer] }',
            '      responses:',
            "        '200': { description: OK }",
        );

        const endpoint = await firstEndpoint(content);

        expect(endpoint.parameters).toEqual([
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            {
                name: 'x-tenant',
                in: 'header',
                required: true,
                description: 'Operation tenant',
                schema: { type: 'string', format: 'uuid' },
            },
            {
                name: 'expand',
                in: 'query',
                required: false,
                schema: { type: 'string', enum: ['items', 'customer'] },
            },
        ]);
    });

    it.each([
        {
            name: 'http bearer from the root security',
            operation: [],
            expected: [
                {
                    name: 'Authorization',
                    in: 'header',
                    required: true,
                    description: 'Bearer token',
                    schema: {},
                },
            ],
        },
        {
            name: 'apiKey from the operation security',
            operation: ['security:', '  - apiKey: []', '  - bearer: []'],
            expected: [{ name: 'X-Api-Key', in: 'header', required: true, schema: {} }],
        },
        {
            name: 'nothing for an explicit empty security',
            operation: ['security: []'],
            expected: [],
        },
        {
            name: 'no duplicate of a declared parameter',
            operation: [
                'security:',
                '  - apiKey: []',
                'parameters:',
                '  - name: x-api-key',
                '    in: header',
                '    description: Declared key',
                '    schema: { type: string }',
            ],
            expected: [
                {
                    name: 'x-api-key',
                    in: 'header',
                    required: false,
                    description: 'Declared key',
                    schema: { type: 'string' },
                },
            ],
        },
    ])('adds security parameters: $name', async ({ operation, expected }) => {
        const content = openapi30(
            'security:',
            '  - bearer: []',
            'paths:',
            '  /orders:',
            '    get:',
            ...operation.map((line) => `      ${line}`),
            '      responses:',
            "        '200': { description: OK }",
            'components:',
            '  securitySchemes:',
            '    bearer: { type: http, scheme: bearer }',
            '    apiKey: { type: apiKey, name: X-Api-Key, in: header }',
        );

        const endpoint = await firstEndpoint(content);

        expect(endpoint.parameters).toEqual(expected);
    });

    it.each([
        {
            name: 'the parameter example first',
            parameter: ['example: 7', 'schema: { type: integer, example: 9, default: 10 }'],
            expected: '7',
        },
        {
            name: 'the first value of the parameter examples',
            parameter: [
                'examples: { first: { value: true }, second: { value: false } }',
                'schema: { type: boolean, example: false }',
            ],
            expected: 'true',
        },
        {
            name: 'the schema example',
            parameter: ['schema: { type: string, example: abc, default: xyz }'],
            expected: 'abc',
        },
        {
            name: 'the schema default',
            parameter: ['schema: { type: string, default: xyz }'],
            expected: 'xyz',
        },
        {
            name: 'an object as JSON',
            parameter: ['example: { a: 1 }', 'schema: { type: object }'],
            expected: '{"a":1}',
        },
        {
            name: 'nothing',
            parameter: ['schema: { type: string }'],
            expected: undefined,
        },
    ])('takes the parameter example from $name', async ({ parameter, expected }) => {
        const content = openapi30(
            ...getOperation(
                'parameters:',
                '  - name: id',
                '    in: query',
                ...parameter.map((line) => `    ${line}`),
            ),
        );

        const endpoint = await firstEndpoint(content);

        expect(endpoint.parameters[0]?.example).toBe(expected);
    });

    it.each([
        {
            name: 'a JSON example pretty-printed',
            body: [
                'required: true',
                'content:',
                '  text/plain:',
                '    example: ignored',
                '  application/json:',
                '    example: { id: 1, tags: [a] }',
            ],
            expected: {
                required: true,
                contentType: 'application/json',
                example: '{\n  "id": 1,\n  "tags": [\n    "a"\n  ]\n}',
            },
        },
        {
            name: 'the first +json media type and the first of examples',
            body: [
                'content:',
                '  text/plain: {}',
                '  application/problem+json:',
                '    examples:',
                '      first: { value: { a: 1 } }',
                '      second: { value: { b: 2 } }',
            ],
            expected: {
                required: false,
                contentType: 'application/problem+json',
                example: '{\n  "a": 1\n}',
            },
        },
        {
            name: 'a form example encoded',
            body: [
                'content:',
                '  application/x-www-form-urlencoded:',
                '    example: { a: 1, b: two }',
            ],
            expected: {
                required: false,
                contentType: 'application/x-www-form-urlencoded',
                example: 'a=1&b=two',
            },
        },
        {
            name: 'a non-string example of another type dropped',
            body: ['content:', '  application/xml:', '    example: { a: 1 }'],
            expected: { required: false, contentType: 'application/xml' },
        },
        {
            name: 'no example when the spec gives neither an example nor a schema',
            body: ['content:', '  application/json: {}'],
            expected: { required: false, contentType: 'application/json' },
        },
    ])('returns the request body with $name', async ({ body, expected }) => {
        const content = openapi30(
            'paths:',
            '  /orders:',
            '    post:',
            '      requestBody:',
            ...body.map((line) => `        ${line}`),
            '      responses:',
            "        '201': { description: Created }",
        );

        const endpoint = await firstEndpoint(content);

        expect(endpoint.requestBody).toEqual(expected);
    });

    it.each([
        {
            name: 'an explicit example over a generated one',
            body: [
                'content:',
                '  application/json:',
                '    schema: { $ref: "#/components/schemas/OrderLine" }',
                '    example: { productId: given, quantity: 5 }',
            ],
            expected: '{\n  "productId": "given",\n  "quantity": 5\n}',
        },
        {
            name: 'a form example generated from the schema',
            body: [
                'content:',
                '  application/x-www-form-urlencoded:',
                '    schema: { $ref: "#/components/schemas/Credentials" }',
            ],
            expected: 'a=text&b=3',
        },
        {
            name: 'no generated example for an XML body',
            body: [
                'content:',
                '  application/xml:',
                '    schema: { $ref: "#/components/schemas/OrderLine" }',
            ],
            expected: undefined,
        },
    ])('returns $name', async ({ body, expected }) => {
        const endpoint = await firstEndpoint(withRequestBody(body));

        expect(endpoint.requestBody?.example).toBe(expected);
    });

    it('generates a pretty-printed JSON example from a referenced schema', async () => {
        const endpoint = await firstEndpoint(
            withRequestBody([
                'content:',
                '  application/json:',
                '    schema: { $ref: "#/components/schemas/OrderLine" }',
            ]),
        );

        const example = endpoint.requestBody?.example ?? '';
        const value: unknown = JSON.parse(example);

        expect(example).toBe(JSON.stringify(value, undefined, 2));
        expect(value).toEqual({
            productId: expect.stringMatching(
                /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/,
            ),
            quantity: expect.any(Number),
        });
    });

    it('leaves read-only properties out of a generated example', async () => {
        const endpoint = await firstEndpoint(
            withRequestBody([
                'content:',
                '  application/json:',
                '    schema: { $ref: "#/components/schemas/Order" }',
            ]),
        );

        const example: unknown = JSON.parse(endpoint.requestBody?.example ?? '{}');

        expect(example).toEqual({ note: 'string' });
    });

    it('finishes on a circular schema', async () => {
        const endpoint = await firstEndpoint(
            withRequestBody([
                'content:',
                '  application/json:',
                '    schema: { $ref: "#/components/schemas/Node" }',
            ]),
        );

        expect(endpoint.requestBody).toMatchObject({ contentType: 'application/json' });
        const example = endpoint.requestBody?.example;
        if (example !== undefined) {
            expect(JSON.parse(example)).toMatchObject({ name: expect.any(String) });
        }
    });

    it('omits the request body when the operation has none', async () => {
        const endpoint = await firstEndpoint(openapi30(...getOperation()));

        expect(endpoint).not.toHaveProperty('requestBody');
    });

    it('derives a stable endpoint id of fixed length from the key', async () => {
        const first = await firstEndpoint(openapi30(...getOperation()));
        const second = await firstEndpoint(openapi31(...getOperation('summary: Changed')));
        const other = await firstEndpoint(
            openapi30(
                'paths:',
                '  /orders:',
                '    post:',
                '      responses:',
                "        '200': { description: OK }",
            ),
        );

        expect(first.id).toHaveLength(ENDPOINT_ID_LENGTH);
        expect(first.id).toMatch(/^[\w-]+$/);
        expect(second.id).toBe(first.id);
        expect(other.id).not.toBe(first.id);
    });
});
