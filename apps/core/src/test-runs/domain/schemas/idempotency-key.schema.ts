import { z } from 'zod/v4';

import { MAX_IDEMPOTENCY_KEY_LENGTH, MIN_IDEMPOTENCY_KEY_LENGTH } from '../constants';

export const IDEMPOTENCY_KEY_PATTERN = /^[\x21-\x7E]+$/;

export const idempotencyKeySchema = z
    .string()
    .min(MIN_IDEMPOTENCY_KEY_LENGTH)
    .max(MAX_IDEMPOTENCY_KEY_LENGTH)
    .regex(IDEMPOTENCY_KEY_PATTERN, 'Must contain visible ASCII characters only');
