import { createZodDto } from 'nestjs-zod';
import { z } from 'zod/v4';

export const HealthResponseSchema = z.object({
    status: z.literal('healthy').describe('Service health status'),
});

export class HealthResponse extends createZodDto(HealthResponseSchema) {}
