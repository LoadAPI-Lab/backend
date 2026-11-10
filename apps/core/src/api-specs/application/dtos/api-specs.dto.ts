import { HTTP_METHODS } from '@shared/constants';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod/v4';

import { BODY_FIELD_TYPES, NAME_MAX_LENGTH, PARAMETER_LOCATIONS } from '../../domain/constants';

const apiSpecIdSchema = z.uuid().describe('API spec id');
const nameSchema = z
    .string()
    .trim()
    .nonempty()
    .max(NAME_MAX_LENGTH)
    .describe('Display name of the spec');

const apiSpecParamsSchema = z.object({
    id: apiSpecIdSchema,
});

export class ApiSpecParamsDto extends createZodDto(apiSpecParamsSchema) {}

const importApiSpecSchema = z.object({
    name: nameSchema
        .optional()
        .describe('Display name of the spec, defaults to the document title cut to 255 characters'),
    content: z
        .string()
        .nonempty()
        .describe('OpenAPI 3.0 or 3.1 document as YAML or JSON text, up to 5 MiB'),
});

export class ImportApiSpecDto extends createZodDto(importApiSpecSchema) {}

const updateApiSpecContentSchema = importApiSpecSchema.extend({
    name: nameSchema
        .optional()
        .describe('New display name of the spec, the current name is kept when omitted'),
});

export class UpdateApiSpecContentDto extends createZodDto(updateApiSpecContentSchema) {}

const renameApiSpecSchema = z.object({
    name: nameSchema,
});

export class RenameApiSpecDto extends createZodDto(renameApiSpecSchema) {}

const serverVariableSchema = z.object({
    default: z.string().describe('Default value'),
    enum: z.array(z.string()).optional().describe('Allowed values'),
    description: z.string().optional().describe('Variable description'),
});

const serverSchema = z.object({
    url: z.string().describe('Server URL with variables replaced by their defaults'),
    relative: z.literal(true).optional().describe('Present when the URL is not absolute http(s)'),
    template: z
        .string()
        .optional()
        .describe('Original URL template, present when it had variables'),
    variables: z
        .record(z.string(), serverVariableSchema)
        .optional()
        .describe('Server variables, present when the URL had variables'),
});

const enumValuesSchema = z.array(z.unknown());

const parameterValueSchema = z
    .object({
        type: z.string().optional(),
        format: z.string().optional(),
        enum: enumValuesSchema.optional(),
        default: z.unknown().optional(),
        example: z.unknown().optional(),
    })
    .describe('Shallow parameter schema');

const parameterSchema = z.object({
    name: z.string().describe('Parameter name'),
    in: z.enum(PARAMETER_LOCATIONS).describe('Parameter location'),
    required: z.boolean().describe('Whether the parameter is required'),
    description: z.string().optional().describe('Parameter description'),
    schema: parameterValueSchema,
    example: z.string().optional().describe('Example value as text'),
});

const bodyFieldSchema = z.object({
    path: z
        .string()
        .describe('Field path: property names joined with dots, array items as index 0'),
    type: z.enum(BODY_FIELD_TYPES).describe('Primitive type of the field'),
    format: z.string().optional().describe('Schema format, e.g. uuid, email, date-time'),
    required: z.boolean().describe('Whether the parent object lists the field as required'),
});

const requestBodySchema = z.object({
    required: z.boolean().describe('Whether the body is required'),
    contentType: z.string().describe('Chosen media type, JSON preferred'),
    example: z
        .string()
        .optional()
        .describe('Example body as text, present when the spec gives one'),
    fields: z
        .array(bodyFieldSchema)
        .optional()
        .describe('Leaf fields of a JSON or form body, present when there is at least one'),
});

const responseSchema = z.object({
    status: z.string().describe('Status code or "default"'),
    description: z.string().describe('Response description'),
});

const endpointSchema = z.object({
    id: z.string().describe('Stable endpoint id derived from the key'),
    key: z.string().describe('"METHOD path"'),
    method: z.enum(HTTP_METHODS).describe('HTTP method'),
    path: z.string().describe('Path template'),
    summary: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()),
    deprecated: z
        .literal(true)
        .optional()
        .describe('Present only when the operation is deprecated'),
    parameters: z.array(parameterSchema),
    requestBody: requestBodySchema.optional(),
    responses: z.array(responseSchema),
});

const apiSpecSummarySchema = z.object({
    id: apiSpecIdSchema,
    name: z.string().describe('Display name'),
    title: z.string().describe('Document title'),
    version: z.string().describe('Document version'),
    endpointsCount: z.number().int().nonnegative().describe('Number of endpoints'),
    createdAt: z.iso.datetime().describe('Import time, ISO 8601'),
});

export class ApiSpecSummaryResponseDto extends createZodDto(apiSpecSummarySchema) {}

export type ApiSpecSummaryResponse = z.infer<typeof apiSpecSummarySchema>;

const apiSpecListSchema = z.array(apiSpecSummarySchema).describe('API specs, newest first');

export class ApiSpecListResponseDto extends createZodDto(apiSpecListSchema) {}

const apiSpecResponseSchema = z.object({
    id: apiSpecIdSchema,
    name: z.string().describe('Display name'),
    title: z.string().describe('Document title'),
    version: z.string().describe('Document version'),
    description: z.string().optional().describe('Document description'),
    createdAt: z.iso.datetime().describe('Import time, ISO 8601'),
    servers: z.array(serverSchema).describe('Servers in document order'),
    endpoints: z.array(endpointSchema).describe('Endpoints in document order'),
});

export class ApiSpecResponseDto extends createZodDto(apiSpecResponseSchema) {}

export type ApiSpecResponse = z.infer<typeof apiSpecResponseSchema>;

const endpointKeysSchema = z.array(z.string());

const endpointChangesSchema = z
    .object({
        added: endpointKeysSchema.describe(
            'Keys of endpoints only in the new version, in new document order',
        ),
        changed: endpointKeysSchema.describe(
            'Keys of endpoints whose parameters, request body or responses changed, in new document order',
        ),
        removed: endpointKeysSchema.describe(
            'Keys of endpoints only in the previous version, in previous document order',
        ),
    })
    .describe('Endpoint changes compared with the previous version, keys are "METHOD path"');

const updatedApiSpecResponseSchema = apiSpecResponseSchema.extend({
    changes: endpointChangesSchema,
});

export class UpdatedApiSpecResponseDto extends createZodDto(updatedApiSpecResponseSchema) {}

export type UpdatedApiSpecResponse = z.infer<typeof updatedApiSpecResponseSchema>;
