import type { ApiSpecEndpoint } from '../../domain/api-spec-document';
import { MAX_FIELD_SCHEMA_NODES } from '../../domain/constants';
import { collectBodyFields } from './body-fields';
import type { DocumentNode } from './document-values';
import { SpecParserImpl } from './spec-parser';

const schemaRef = (name: string): DocumentNode => ({ $ref: `#/components/schemas/${name}` });

const documentWith = (schemas: DocumentNode): DocumentNode => ({ components: { schemas } });

const FAN_OUT_LEVELS = 8;
const FAN_OUT_WIDTH = 10;

const fanOutSchemas = (): DocumentNode => {
    const schemas: DocumentNode = {};
    for (let level = 0; level < FAN_OUT_LEVELS; level += 1) {
        const properties: DocumentNode = { name: { type: 'string' } };
        if (level < FAN_OUT_LEVELS - 1) {
            for (let index = 0; index < FAN_OUT_WIDTH; index += 1) {
                properties[`p${index}`] = schemaRef(`Level${level + 1}`);
            }
        }
        schemas[`Level${level}`] = { type: 'object', properties };
    }
    return schemas;
};

const bodyEndpoint = async (mediaType: string): Promise<ApiSpecEndpoint> => {
    const content = [
        'openapi: 3.0.3',
        'info: { title: Shop, version: 1.0.0 }',
        'paths:',
        '  /orders:',
        '    post:',
        '      requestBody:',
        '        content:',
        `          ${mediaType}:`,
        '            schema:',
        '              type: object',
        '              required: [productId]',
        '              properties:',
        '                productId: { type: string, format: uuid }',
        '                quantity: { type: integer }',
        '      responses:',
        "        '201': { description: Created }",
    ].join('\n');
    const { endpoints } = await new SpecParserImpl().parse(content);
    const [endpoint] = endpoints;
    if (!endpoint) {
        throw new Error('Expected at least one endpoint');
    }
    return endpoint;
};

describe('collectBodyFields', () => {
    it('returns dotted paths of a nested object with required flags', () => {
        const schema = {
            type: 'object',
            required: ['customer'],
            properties: {
                customer: {
                    type: 'object',
                    required: ['email'],
                    properties: {
                        email: { type: 'string' },
                        age: { type: 'integer' },
                    },
                },
                paid: { type: 'boolean' },
            },
        };

        expect(collectBodyFields(schema, {})).toEqual([
            { path: 'customer.email', type: 'string', required: true },
            { path: 'customer.age', type: 'integer', required: false },
            { path: 'paid', type: 'boolean', required: false },
        ]);
    });

    it('uses index 0 for items of a nested array', () => {
        const schema = {
            type: 'object',
            required: ['list'],
            properties: {
                list: {
                    type: 'array',
                    items: {
                        type: 'object',
                        required: ['name'],
                        properties: { name: { type: 'string' } },
                    },
                },
            },
        };

        expect(collectBodyFields(schema, {})).toEqual([
            { path: 'list.0.name', type: 'string', required: true },
        ]);
    });

    it('uses index 0 for items of a top-level array', () => {
        const schema = {
            type: 'array',
            items: { type: 'object', properties: { name: { type: 'string' } } },
        };

        expect(collectBodyFields(schema, {})).toEqual([
            { path: '0.name', type: 'string', required: false },
        ]);
    });

    it('merges properties and required lists of allOf subschemas', () => {
        const root = documentWith({
            Base: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        });
        const schema = {
            allOf: [
                schemaRef('Base'),
                { type: 'object', required: ['total'], properties: { total: { type: 'number' } } },
            ],
        };

        expect(collectBodyFields(schema, root)).toEqual([
            { path: 'id', type: 'string', required: true },
            { path: 'total', type: 'number', required: true },
        ]);
    });

    it('skips read-only properties, keeps formats and reads 3.1 nullable types', () => {
        const schema = {
            type: 'object',
            properties: {
                id: { type: 'string', readOnly: true },
                orderId: { type: 'string', format: 'uuid' },
                note: { type: ['string', 'null'] },
            },
        };

        expect(collectBodyFields(schema, {})).toEqual([
            { path: 'orderId', type: 'string', format: 'uuid', required: false },
            { path: 'note', type: 'string', required: false },
        ]);
    });

    it('terminates on a self-referencing schema', () => {
        const root = documentWith({
            Node: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    children: { type: 'array', items: schemaRef('Node') },
                },
            },
        });

        expect(collectBodyFields(schemaRef('Node'), root)).toEqual([
            { path: 'name', type: 'string', required: false },
        ]);
    });

    it('stays within the node budget on a fan-out schema', () => {
        const root = documentWith(fanOutSchemas());

        const fields = collectBodyFields(schemaRef('Level0'), root);

        expect(fields.length).toBeGreaterThan(0);
        expect(fields.length).toBeLessThanOrEqual(MAX_FIELD_SCHEMA_NODES);
    });
});

describe('request body fields in parsed endpoints', () => {
    it('omits fields for an XML body', async () => {
        const endpoint = await bodyEndpoint('application/xml');

        expect(endpoint.requestBody).toBeDefined();
        expect(endpoint.requestBody).not.toHaveProperty('fields');
    });

    it('returns fields for a form body', async () => {
        const endpoint = await bodyEndpoint('application/x-www-form-urlencoded');

        expect(endpoint.requestBody?.fields).toEqual([
            { path: 'productId', type: 'string', format: 'uuid', required: true },
            { path: 'quantity', type: 'integer', required: false },
        ]);
    });
});
