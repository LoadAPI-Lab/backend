import { createZodDto } from 'nestjs-zod';
import { z } from 'zod/v4';

import {
    DEFAULT_PAGE_LIMIT,
    MAX_PAGE_LIMIT,
    MIN_PAGE_LIMIT,
    TEST_RUN_STATUSES,
    HTTP_METHODS,
    TEST_TYPES,
} from '../../domain/constants';
import {
    loadTestResultSchema,
    scenarioResultSchema,
    testConfigSchema,
    type TestConfigInput,
} from '../../domain/schemas';

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

const testRunRequestSchema = z
    .object({
        method: z.enum(HTTP_METHODS).describe('HTTP method'),
        url: z
            .string()
            .describe(
                'URL template as entered by the user, secret query parameter values are masked as ***',
            ),
    })
    .describe('Tested request, present on single runs');

const testRunResultSchema = z
    .union([loadTestResultSchema, scenarioResultSchema])
    .describe(
        'Final result, present on COMPLETED and STOPPED runs when it matches the stored shape. ' +
            'Its shape follows `type`: single gives the load test result, scenario gives the ' +
            'scenario result. Secret URL query parameter values are masked as ***',
    );

const testRunLoadShape = {
    targetRps: z.number().int().describe('Target RPS after ramp-up'),
    durationSeconds: z.number().int().describe('Test duration in seconds'),
    rampUpSeconds: z.number().int().optional().describe('Ramp-up duration in seconds'),
};

const testRunConfigTargetSchema = z
    .object({
        method: z.enum(HTTP_METHODS).describe('HTTP method'),
        url: z.string().describe('URL template, secret query parameter values are masked as ***'),
        headers: z
            .record(z.string(), z.string())
            .optional()
            .describe('Request headers, secret header values are masked'),
        body: z.string().optional().describe('Request body template'),
    })
    .describe('Tested request');

const singleConfigResponseSchema = z
    .object({
        target: testRunConfigTargetSchema,
        ...testRunLoadShape,
    })
    .describe('Single test config');

const extractRuleResponseSchema = z.object({
    name: z.string().describe('Variable name'),
    path: z.string().describe('Path in the response body'),
});

const scenarioStepResponseSchema = z.object({
    target: testRunConfigTargetSchema,
    extract: z
        .array(extractRuleResponseSchema)
        .optional()
        .describe('Variables extracted from the response'),
});

const scenarioConfigResponseSchema = z
    .object({
        steps: z.array(scenarioStepResponseSchema).describe('Scenario steps in execution order'),
    })
    .describe('Scenario test config');

const testRunConfigResponseSchema = z
    .union([singleConfigResponseSchema, scenarioConfigResponseSchema])
    .describe(
        'Stored test config. Its shape follows `type`. Secret values are masked: ' +
            'secret header values become *** (Authorization keeps its scheme, e.g. "Bearer ***") ' +
            'and secret URL query parameter values become ***. Template placeholders such as ' +
            '{{accessToken}} are kept. Bodies are returned as stored',
    );

const testRunBaseShape = {
    id: testRunIdSchema,
    type: testTypeSchema,
    status: testRunStatusSchema,
    createdAt: z.iso.datetime().describe('Creation time, ISO 8601'),
    startedAt: z.iso.datetime().optional().describe('Start time, ISO 8601'),
    finishedAt: z.iso.datetime().optional().describe('Finish time, ISO 8601'),
    reason: z.string().optional().describe('Failure reason, present on FAILED runs'),
};

const testRunListItemSchema = z.object({
    ...testRunBaseShape,
    request: testRunRequestSchema.optional(),
    targetRps: testRunLoadShape.targetRps.optional().describe('Target RPS, present on single runs'),
    durationSeconds: testRunLoadShape.durationSeconds
        .optional()
        .describe('Test duration in seconds, present on single runs'),
    p95Ms: z
        .number()
        .optional()
        .describe(
            '95th percentile of the response time in ms, present on single runs whose result has it',
        ),
    stepsCount: z.number().int().optional().describe('Number of steps, present on scenario runs'),
    okCount: z
        .number()
        .int()
        .optional()
        .describe('Steps that succeeded, present on scenario runs with a result'),
});

export type TestRunListItem = z.infer<typeof testRunListItemSchema>;

const testRunResponseSchema = z.object({
    ...testRunBaseShape,
    config: testRunConfigResponseSchema,
    result: testRunResultSchema.optional(),
});

export class TestRunResponseDto extends createZodDto(testRunResponseSchema) {}

export type TestRunResponse = z.infer<typeof testRunResponseSchema>;

export type TestRunResult = z.infer<typeof testRunResultSchema>;

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
