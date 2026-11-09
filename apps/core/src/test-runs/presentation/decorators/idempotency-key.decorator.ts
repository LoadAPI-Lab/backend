import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { ZodValidationException } from 'nestjs-zod';

import { IDEMPOTENCY_KEY_HEADER_FIELD, idempotencyKeyHeadersSchema } from '../../application/dtos';

export const IdempotencyKey = createParamDecorator(
    (_data: unknown, context: ExecutionContext): string | undefined => {
        const { headers } = context.switchToHttp().getRequest<FastifyRequest>();
        const parsed = idempotencyKeyHeadersSchema.safeParse({
            [IDEMPOTENCY_KEY_HEADER_FIELD]: headers[IDEMPOTENCY_KEY_HEADER_FIELD],
        });

        if (!parsed.success) {
            throw new ZodValidationException(parsed.error);
        }

        return parsed.data[IDEMPOTENCY_KEY_HEADER_FIELD];
    },
);
