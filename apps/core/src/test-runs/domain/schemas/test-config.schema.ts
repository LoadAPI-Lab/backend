import { z } from 'zod/v4';

import { scenarioConfigSchema } from './scenario-config.schema';
import { singleConfigSchema } from './single-config.schema';

export const testConfigSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('single'), config: singleConfigSchema }),
    z.object({ type: z.literal('scenario'), config: scenarioConfigSchema }),
]);

export type TestConfigInput = z.infer<typeof testConfigSchema>;
