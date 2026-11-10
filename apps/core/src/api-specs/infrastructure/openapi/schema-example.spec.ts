import { z } from 'zod/v4';

import { testConfigSchema } from '../../../test-runs/domain/schemas';
import type { DocumentNode } from './document-values';
import { exampleFromSchema } from './schema-example';

const TODAY = new Date('2026-11-10T12:00:00Z');

const schemaRef = (name: string): DocumentNode => ({ $ref: `#/components/schemas/${name}` });

const generate = (schema: unknown, schemas: DocumentNode = {}): unknown =>
    exampleFromSchema(schema, { root: { components: { schemas } }, today: TODAY });

describe('exampleFromSchema', () => {
    it.each([
        {
            name: 'the schema example',
            schema: { type: 'string', example: 'given', default: 'd' },
            expected: 'given',
        },
        {
            name: 'the first of the schema examples',
            schema: { type: 'integer', examples: [7, 8] },
            expected: 7,
        },
        {
            name: 'the default',
            schema: { type: 'string', default: 'fallback', enum: ['a'] },
            expected: 'fallback',
        },
        {
            name: 'the first enum value',
            schema: { type: 'string', enum: ['active', 'archived'] },
            expected: 'active',
        },
        { name: 'the const value', schema: { const: 'single' }, expected: 'single' },
        {
            name: 'a uuid generator',
            schema: { type: 'string', format: 'uuid' },
            expected: '{{$uuid}}',
        },
        {
            name: 'an email generator',
            schema: { type: 'string', format: 'email' },
            expected: '{{$randomEmail}}',
        },
        {
            name: 'a timestamp generator',
            schema: { type: 'string', format: 'date-time' },
            expected: '{{$timestamp}}',
        },
        {
            name: 'an example URL for uri',
            schema: { type: 'string', format: 'uri' },
            expected: 'https://example.com',
        },
        {
            name: 'an example URL for url',
            schema: { type: 'string', format: 'url' },
            expected: 'https://example.com',
        },
        {
            name: "today's ISO date",
            schema: { type: 'string', format: 'date' },
            expected: '2026-11-10',
        },
        {
            name: 'readable text for a plain string',
            schema: { type: 'string' },
            expected: 'example',
        },
        {
            name: 'text padded to minLength',
            schema: { type: 'string', minLength: 10 },
            expected: 'examplexxx',
        },
        {
            name: 'text cut to maxLength',
            schema: { type: 'string', maxLength: 3 },
            expected: 'exa',
        },
        { name: '1 for a number without bounds', schema: { type: 'number' }, expected: 1 },
        { name: 'the minimum', schema: { type: 'integer', minimum: 5 }, expected: 5 },
        { name: 'the minimum when it is 0', schema: { type: 'integer', minimum: 0 }, expected: 0 },
        {
            name: 'above an exclusive minimum',
            schema: { type: 'integer', minimum: 5, exclusiveMinimum: true },
            expected: 6,
        },
        {
            name: 'above a numeric exclusive minimum',
            schema: { type: 'integer', exclusiveMinimum: 0 },
            expected: 1,
        },
        {
            name: 'the maximum when it is below 1',
            schema: { type: 'integer', maximum: 0 },
            expected: 0,
        },
        { name: 'true for a boolean', schema: { type: 'boolean' }, expected: true },
        {
            name: 'the non-null type of a type list',
            schema: { type: ['null', 'integer'] },
            expected: 1,
        },
    ])('returns $name', ({ schema, expected }) => {
        expect(generate(schema)).toEqual(expected);
    });

    it('builds an object from its properties, leaving read-only ones out', () => {
        const schema = {
            type: 'object',
            properties: {
                id: { type: 'string', readOnly: true },
                name: { type: 'string' },
                address: {
                    type: 'object',
                    properties: { city: { type: 'string', example: 'Dublin' } },
                },
            },
        };

        expect(generate(schema)).toEqual({ name: 'example', address: { city: 'Dublin' } });
    });

    it('gives a string field named like a URL an example URL', () => {
        const schema = {
            type: 'object',
            properties: {
                url: { type: 'string' },
                callbackUrl: { type: 'string' },
                image_uri: { type: 'string' },
                curl: { type: 'string' },
            },
        };

        expect(generate(schema)).toEqual({
            url: 'https://example.com',
            callbackUrl: 'https://example.com',
            image_uri: 'https://example.com',
            curl: 'example',
        });
    });

    it('gives an array one item, or minItems items', () => {
        expect(generate({ type: 'array', items: { type: 'integer' } })).toEqual([1]);
        expect(generate({ type: 'array', items: { type: 'boolean' }, minItems: 2 })).toEqual([
            true,
            true,
        ]);
    });

    it('gives an additionalProperties map one entry with a readable key', () => {
        const schema = { type: 'object', additionalProperties: { type: 'string' } };

        expect(generate(schema)).toEqual({ key: 'example' });
    });

    it('adds no entry for additionalProperties set to true', () => {
        const schema = {
            type: 'object',
            properties: { count: { type: 'integer' } },
            additionalProperties: true,
        };

        expect(generate(schema)).toEqual({ count: 1 });
    });

    it('follows $ref', () => {
        const schemas = {
            Line: { type: 'object', properties: { sku: { type: 'string', example: 'A-1' } } },
        };

        expect(generate({ type: 'array', items: schemaRef('Line') }, schemas)).toEqual([
            { sku: 'A-1' },
        ]);
    });

    it('merges allOf members, with the own properties winning', () => {
        const schemas = {
            Base: {
                type: 'object',
                properties: {
                    id: { type: 'integer', minimum: 10 },
                    status: { type: 'string', enum: ['a'] },
                },
            },
        };
        const schema = {
            allOf: [schemaRef('Base'), { properties: { note: { type: 'string' } } }],
            properties: { status: { type: 'string', enum: ['b'] } },
        };

        expect(generate(schema, schemas)).toEqual({ id: 10, status: 'b', note: 'example' });
    });

    it.each(['oneOf', 'anyOf'])('uses the first option of %s', (keyword) => {
        const schema = {
            [keyword]: [
                { type: 'object', properties: { kind: { const: 'card' } } },
                { type: 'object', properties: { kind: { const: 'cash' } } },
            ],
        };

        expect(generate(schema)).toEqual({ kind: 'card' });
    });

    it('stops a cyclic $ref at depth 3', () => {
        const schemas = {
            Node: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    children: { type: 'array', items: schemaRef('Node') },
                },
            },
        };

        expect(generate(schemaRef('Node'), schemas)).toEqual({
            name: 'example',
            children: [{ name: 'example', children: [{ name: 'example', children: [] }] }],
        });
    });

    it('stops a cycle that runs through allOf', () => {
        const schemas = {
            Item: {
                allOf: [{ type: 'object', properties: { next: schemaRef('Item') } }],
                properties: { label: { type: 'string' } },
            },
        };

        expect(generate(schemaRef('Item'), schemas)).toEqual({
            next: { next: { label: 'example' }, label: 'example' },
            label: 'example',
        });
    });

    it('returns nothing for a schema without a type', () => {
        expect(generate({ description: 'anything' })).toBeUndefined();
    });

    it("produces a start test run body that passes core's own schema", () => {
        const example = generate(z.toJSONSchema(testConfigSchema));

        expect(example).toMatchObject({
            type: 'single',
            config: { target: { method: 'GET', url: 'https://example.com' }, targetRps: 1 },
        });
        expect(testConfigSchema.safeParse(example).success).toBe(true);
    });
});
