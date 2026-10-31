import { createZodDto } from 'nestjs-zod';
import { z } from 'zod/v4';

import { TEST_RUN_STATUSES, TEST_TYPES } from '../../domain/constants';
import { testConfigSchema, type TestConfigInput } from '../../domain/schemas';

const testRunIdSchema = z.uuid().describe('Test run id');
const testRunStatusSchema = z.enum(TEST_RUN_STATUSES).describe('Test run status');

export const StartTestRunDto = Object.defineProperty(createZodDto(testConfigSchema), 'name', {
    value: 'StartTestRunDto',
});
export type StartTestRunDto = TestConfigInput;

const startTestRunResponseSchema = z.object({
    id: testRunIdSchema,
    status: testRunStatusSchema,
});

export class StartTestRunResponseDto extends createZodDto(startTestRunResponseSchema) {}

export type StartTestRunResponse = z.infer<typeof startTestRunResponseSchema>;

const testRunResponseSchema = z.object({
    id: testRunIdSchema,
    type: z.enum(TEST_TYPES).describe('Test type'),
    status: testRunStatusSchema,
    createdAt: z.iso.datetime().describe('Creation time, ISO 8601'),
    startedAt: z.iso.datetime().optional().describe('Start time, ISO 8601'),
    finishedAt: z.iso.datetime().optional().describe('Finish time, ISO 8601'),
    reason: z.string().optional().describe('Failure reason, present on FAILED runs'),
    result: z.unknown().optional().describe('Final result, absent on FAILED runs'),
});

export class TestRunResponseDto extends createZodDto(testRunResponseSchema) {}
