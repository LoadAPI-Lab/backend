import { createZodDto } from 'nestjs-zod';
import { z } from 'zod/v4';

export const ErrorDetailSchema = z.object({
    field: z.string().describe('Path to the field (e.g. "user.email")'),
    message: z.string().describe('Error message'),
    code: z.string().describe('Machine-readable code (e.g. "too_small")'),
});

export type ErrorDetail = z.infer<typeof ErrorDetailSchema>;

const ErrorMetaSchema = z.object({
    service: z.string().default('core').describe('Name of the microservice'),
    request: z.object({
        requestId: z.string().describe('Trace ID for logs'),
        path: z.string().describe('Endpoint URL'),
        method: z.string().describe('HTTP method'),
        ip: z.string().optional().describe('Client IP'),
    }),
    timestamp: z
        .string()
        .refine((val: any) => !isNaN(Date.parse(val)), {
            message: 'The string is not a valid date',
        })
        .describe('Error time, ISO 8601'),
    debug: z
        .object({
            stack: z.string().optional().describe('Call stack (development only)'),
        })
        .optional(),
});

export const GlobalErrorSchema = z.object({
    success: z.literal(false).default(false),
    error: z.object({
        code: z.string().describe('Business error code'),
        message: z.string().describe('Description for the user'),
        retryable: z.boolean().describe('Whether retrying the request may succeed'),
    }),
    details: z.array(ErrorDetailSchema).optional(),
    meta: ErrorMetaSchema,
});

export class GlobalErrorResponse extends createZodDto(GlobalErrorSchema) {}
