import { z } from 'zod/v4';

import { idempotencyKeySchema } from '../../domain/schemas';

export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';
export const IDEMPOTENCY_KEY_HEADER_FIELD = 'idempotency-key';

export const idempotencyKeyHeadersSchema = z.object({
    [IDEMPOTENCY_KEY_HEADER_FIELD]: idempotencyKeySchema.optional(),
});
