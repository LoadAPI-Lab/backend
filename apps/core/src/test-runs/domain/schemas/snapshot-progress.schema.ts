import { z } from 'zod/v4';

export const snapshotProgressSchema = z.object({
    elapsedSeconds: z.number(),
});
