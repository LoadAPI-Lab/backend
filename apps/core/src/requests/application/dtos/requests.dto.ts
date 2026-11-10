import { createZodDto } from 'nestjs-zod';
import { z } from 'zod/v4';

import { RequestOutcomeKind, SEND_ERROR_CATEGORIES } from '../../domain/constants';
import { outgoingRequestSchema } from '../../domain/schemas';

export class SendRequestDto extends createZodDto(outgoingRequestSchema) {}

const durationMsSchema = z
    .number()
    .nonnegative()
    .describe(
        'Time from sending until the body was read or truncated, milliseconds with fractions',
    );

const responseHeaderSchema = z.object({
    name: z.string().describe('Header name as received'),
    value: z.string().describe('Header value'),
});

const receivedResponseSchema = z.object({
    kind: z.literal(RequestOutcomeKind.RESPONSE),
    status: z.number().int().describe('Status code of the target response'),
    statusText: z.string().optional().describe('Reason phrase, present when the target sent one'),
    headers: z
        .array(responseHeaderSchema)
        .describe('Response headers in received order, repeated headers as separate entries'),
    body: z
        .string()
        .optional()
        .describe('Response body as UTF-8 text, present for text content types'),
    binary: z
        .literal(true)
        .optional()
        .describe('Present when the content type is not text; the body is then omitted'),
    bodyTruncated: z
        .literal(true)
        .optional()
        .describe('Present when the body exceeded 1 MiB and reading stopped'),
    sizeBytes: z.number().int().nonnegative().describe('Number of body bytes read'),
    durationMs: durationMsSchema,
});

const failedRequestSchema = z.object({
    kind: z.literal(RequestOutcomeKind.ERROR),
    durationMs: durationMsSchema,
    error: z.object({
        category: z.enum(SEND_ERROR_CATEGORIES).describe('Network error category'),
        message: z.string().describe('Fixed description of the category'),
    }),
});

const sendRequestResponseSchema = z.discriminatedUnion('kind', [
    receivedResponseSchema,
    failedRequestSchema,
]);

export const SendRequestResponseDto = Object.defineProperty(
    createZodDto(sendRequestResponseSchema),
    'name',
    { value: 'SendRequestResponseDto' },
);
