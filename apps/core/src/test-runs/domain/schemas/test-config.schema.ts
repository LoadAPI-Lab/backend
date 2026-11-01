import { z } from 'zod/v4';

import { TestType } from '../constants';
import { scenarioConfigSchema } from './scenario-config.schema';
import { singleConfigSchema } from './single-config.schema';

export const testConfigSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal(TestType.SINGLE), config: singleConfigSchema }),
    z.object({ type: z.literal(TestType.SCENARIO), config: scenarioConfigSchema }),
]);

export type TestConfigInput = z.infer<typeof testConfigSchema>;
