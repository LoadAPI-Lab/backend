import { z } from 'zod/v4';

const percentilesSchema = (subject: string) =>
    z
        .object({
            p50Ms: z.number().describe('50th percentile in ms'),
            p95Ms: z.number().describe('95th percentile in ms'),
            p99Ms: z.number().describe('99th percentile in ms'),
        })
        .describe(`${subject}, only successful responses, absent without them`);

const countsByKeySchema = (subject: string) => z.record(z.string(), z.number()).describe(subject);

const singleRunTargetSummarySchema = z.object({
    totalRequests: z.number().describe('Requests sent'),
    successCount: z.number().describe('Responses with status < 400'),
    errorCount: z.number().describe('Responses with status >= 400 plus network errors'),
    errorRate: z.number().describe('errorCount / totalRequests, 0..1'),
    lateCount: z.number().describe('Requests sent later than planned beyond the threshold'),
    responseTime: percentilesSchema('Time from the planned send moment').optional(),
    serviceTime: percentilesSchema('Time from the actual send moment').optional(),
    statusCodes: countsByKeySchema(
        'HTTP responses by status code, absent without responses',
    ).optional(),
    errors: countsByKeySchema(
        'Network errors without an HTTP response by kind, absent without them',
    ).optional(),
});

export const singleRunSummarySchema = z.object({
    durationMs: z.number().describe('Sending duration in ms'),
    targetRps: z.number().describe('Target RPS after ramp-up'),
    avgRps: z.number().describe('Average achieved RPS'),
    ...singleRunTargetSummarySchema.shape,
});

export type SingleRunSummary = z.infer<typeof singleRunSummarySchema>;

export const scenarioRunSummarySchema = z.object({
    totalSteps: z.number().describe('Steps in the scenario'),
    okCount: z.number().describe('Steps that succeeded'),
    failedCount: z.number().describe('Steps that failed'),
    skippedCount: z.number().describe('Steps that were skipped'),
    durationMs: z.number().describe('Scenario duration in ms'),
});

export type ScenarioRunSummary = z.infer<typeof scenarioRunSummarySchema>;

export const storedSingleResultSchema = z.object({
    durationMs: z.number(),
    targetRps: z.number(),
    avgRps: z.number(),
    targets: z.tuple([singleRunTargetSummarySchema]),
});

export const storedScenarioResultSchema = z.object({
    summary: scenarioRunSummarySchema,
});
