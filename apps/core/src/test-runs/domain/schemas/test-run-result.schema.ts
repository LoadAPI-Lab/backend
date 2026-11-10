import { HTTP_METHODS } from '@shared/constants';
import { z } from 'zod/v4';

import { STEP_STATUSES } from '../constants';

const percentilesSchema = (subject: string) =>
    z
        .object({
            p50Ms: z.number().describe('50th percentile in ms'),
            p95Ms: z.number().describe('95th percentile in ms'),
            p99Ms: z.number().describe('99th percentile in ms'),
        })
        .describe(`${subject}, only successful responses, absent without them`);

const countsByKeySchema = (subject: string) =>
    z.record(z.string(), z.number().int()).describe(subject);

const resultUrlSchema = z
    .string()
    .describe('URL as entered by the user, secret query parameter values are masked as ***');

const loadTestTargetResultSchema = z.object({
    method: z.enum(HTTP_METHODS).describe('HTTP method'),
    url: resultUrlSchema,
    totalRequests: z.number().int().describe('Requests sent'),
    successCount: z.number().int().describe('Responses with status < 400'),
    errorCount: z.number().int().describe('Responses with status >= 400 plus network errors'),
    errorRate: z.number().describe('errorCount / totalRequests, 0..1'),
    lateCount: z.number().int().describe('Requests sent later than planned beyond the threshold'),
    responseTime: percentilesSchema('Time from the planned send moment').optional(),
    serviceTime: percentilesSchema('Time from the actual send moment').optional(),
    statusCodes: countsByKeySchema(
        'HTTP responses by status code, absent without responses',
    ).optional(),
    errors: countsByKeySchema(
        'Network errors without an HTTP response by kind, absent without them',
    ).optional(),
});

export const loadTestResultSchema = z
    .object({
        durationMs: z.number().describe('Sending duration in ms'),
        targetRps: z.number().int().describe('Target RPS after ramp-up'),
        avgRps: z.number().describe('Average achieved RPS'),
        targets: z.array(loadTestTargetResultSchema).describe('Metrics per tested request'),
    })
    .describe('Load test result');

export type LoadTestResult = z.infer<typeof loadTestResultSchema>;

const scenarioSummarySchema = z
    .object({
        totalSteps: z.number().int().describe('Steps in the scenario'),
        okCount: z.number().int().describe('Steps that succeeded'),
        failedCount: z.number().int().describe('Steps that failed'),
        skippedCount: z.number().int().describe('Steps that were skipped'),
        durationMs: z.number().describe('Scenario duration in ms'),
    })
    .describe('Scenario totals');

const scenarioStepResultSchema = z.object({
    method: z.enum(HTTP_METHODS).describe('HTTP method'),
    url: resultUrlSchema,
    status: z
        .enum(STEP_STATUSES)
        .describe(
            'OK: status < 400 and extraction succeeded; FAILED: network error, status >= 400 ' +
                'or extraction failed; SKIPPED: not sent',
        ),
    statusCode: z.number().int().optional().describe('HTTP status code, absent without a response'),
    durationMs: z.number().optional().describe('Step duration in ms, absent on skipped steps'),
    description: z.string().optional().describe('Why the step failed or was skipped'),
});

export const scenarioResultSchema = z
    .object({
        summary: scenarioSummarySchema,
        steps: z
            .array(scenarioStepResultSchema)
            .describe('Step results, one per config step in execution order'),
    })
    .describe('Scenario result');

export type ScenarioResult = z.infer<typeof scenarioResultSchema>;
