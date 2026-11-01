import { createZodDto } from 'nestjs-zod';
import { z } from 'zod/v4';

import {
    DEFAULT_PAGE_LIMIT,
    MAX_PAGE_LIMIT,
    MIN_PAGE_LIMIT,
    TEST_RUN_STATUSES,
    TEST_TYPES,
} from '../../domain/constants';
import { testConfigSchema, type TestConfigInput } from '../../domain/schemas';

const testRunIdSchema = z.uuid().describe('Test run id');
const testRunStatusSchema = z.enum(TEST_RUN_STATUSES).describe('Test run status');
const testTypeSchema = z.enum(TEST_TYPES).describe('Test type');

const testRunParamsSchema = z.object({
    id: testRunIdSchema,
});

export class TestRunParamsDto extends createZodDto(testRunParamsSchema) {}

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
    type: testTypeSchema,
    status: testRunStatusSchema,
    createdAt: z.iso.datetime().describe('Creation time, ISO 8601'),
    startedAt: z.iso.datetime().optional().describe('Start time, ISO 8601'),
    finishedAt: z.iso.datetime().optional().describe('Finish time, ISO 8601'),
    reason: z.string().optional().describe('Failure reason, present on FAILED runs'),
    result: z.unknown().optional().describe('Final result, absent on FAILED runs'),
});

export class TestRunResponseDto extends createZodDto(testRunResponseSchema) {}

export type TestRunResponse = z.infer<typeof testRunResponseSchema>;

const listTestRunsQuerySchema = z.object({
    limit: z.coerce
        .number()
        .int()
        .min(MIN_PAGE_LIMIT)
        .max(MAX_PAGE_LIMIT)
        .default(DEFAULT_PAGE_LIMIT)
        .describe('Page size'),
    cursor: z.string().optional().describe('Opaque cursor from the previous page'),
    status: testRunStatusSchema.optional(),
    type: testTypeSchema.optional(),
});

export class ListTestRunsQueryDto extends createZodDto(listTestRunsQuerySchema) {}

const testRunListItemSchema = testRunResponseSchema.omit({ result: true });

export type TestRunListItem = z.infer<typeof testRunListItemSchema>;

const listTestRunsResponseSchema = z.object({
    items: z.array(testRunListItemSchema).describe('Test runs, newest first'),
    nextCursor: z.string().optional().describe('Cursor of the next page, absent on the last page'),
});

export class ListTestRunsResponseDto extends createZodDto(listTestRunsResponseSchema) {}

export type ListTestRunsResponse = z.infer<typeof listTestRunsResponseSchema>;

const stopTestRunResponseSchema = z.object({
    id: testRunIdSchema,
    status: testRunStatusSchema,
});

export class StopTestRunResponseDto extends createZodDto(stopTestRunResponseSchema) {}

export type StopTestRunResponse = z.infer<typeof stopTestRunResponseSchema>;
