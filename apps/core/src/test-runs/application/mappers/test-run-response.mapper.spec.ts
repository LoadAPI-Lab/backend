import { Logger } from '@nestjs/common';

import { HttpMethod, TestRunStatus, TestType } from '../../domain/constants';
import { TestRun } from '../../domain/test-run';
import { toTestRunListItem, toTestRunResponse } from './test-run-response.mapper';

const TEST_ID = 'b3f1c2d4-7a1e-4f0b-9c3a-2e8d5f6a7b90';
const USER_ID = '5d7e9a10-3c4b-4e2f-8a1d-6b9c0e2f4a13';
const URL_TEMPLATE = 'https://api.example.com/users/{{userId}}?q={{$randomInt}}';
const SECRET_HEADER = 'Bearer super-secret-token';
const SECRET_BODY = 'password=hunter2';
const FAILURE_REASON = 'invalid single test config';
const CREATED_AT = new Date('2026-01-01T00:00:00.000Z');
const STARTED_AT = new Date('2026-01-01T00:01:00.000Z');
const FINISHED_AT = new Date('2026-01-01T00:02:00.000Z');

const singleTarget = {
    method: HttpMethod.POST,
    url: URL_TEMPLATE,
    headers: { Authorization: SECRET_HEADER },
    body: SECRET_BODY,
};

const RESULT_URL = 'https://api.example.com/users/1';
const TARGET_RPS = 500;
const DURATION_SECONDS = 60;
const RAMP_UP_SECONDS = 10;

const singleLoad = {
    targetRps: TARGET_RPS,
    durationSeconds: DURATION_SECONDS,
    rampUpSeconds: RAMP_UP_SECONDS,
};

const resultTotals = {
    durationMs: 60_220.4,
    targetRps: TARGET_RPS,
    avgRps: 496,
};

const targetMetrics = {
    totalRequests: 29_870,
    successCount: 29_100,
    errorCount: 770,
    errorRate: 0.0258,
    lateCount: 12,
    responseTime: { p50Ms: 22.8, p95Ms: 190.2, p99Ms: 455 },
    serviceTime: { p50Ms: 22.5, p95Ms: 186.7, p99Ms: 431.9 },
    statusCodes: { '201': 29_100, '500': 690 },
    errors: { timeout: 80 },
};

const singleResult = {
    ...resultTotals,
    targets: [{ method: HttpMethod.POST, url: RESULT_URL, ...targetMetrics }],
};

const networkErrorsMetrics = {
    totalRequests: 120,
    successCount: 0,
    errorCount: 120,
    errorRate: 1,
    lateCount: 0,
    errors: { connection_refused: 120 },
};

const networkErrorsResult = {
    ...resultTotals,
    targets: [{ method: HttpMethod.POST, url: RESULT_URL, ...networkErrorsMetrics }],
};

const scenarioSummary = {
    totalSteps: 2,
    okCount: 1,
    failedCount: 1,
    skippedCount: 0,
    durationMs: 150.3,
};

interface SingleRunExtra {
    result?: unknown;
    reason?: string;
    startedAt?: Date;
    finishedAt?: Date;
}

const singleRun = (status: TestRunStatus, extra: SingleRunExtra = {}) =>
    TestRun.restore({
        id: TEST_ID,
        userId: USER_ID,
        type: TestType.SINGLE,
        status,
        config: { target: singleTarget, ...singleLoad },
        createdAt: CREATED_AT,
        ...extra,
    });

const scenarioRun = (result: unknown) =>
    TestRun.restore({
        id: TEST_ID,
        userId: USER_ID,
        type: TestType.SCENARIO,
        status: TestRunStatus.COMPLETED,
        config: {
            steps: [
                { target: singleTarget, extract: [{ name: 'userId', path: 'data.id' }] },
                { target: { method: HttpMethod.GET, url: URL_TEMPLATE } },
            ],
        },
        createdAt: CREATED_AT,
        startedAt: STARTED_AT,
        finishedAt: FINISHED_AT,
        result,
    });

describe('test run response mapper', () => {
    let warn: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('maps a completed single run to request, load and the full summary', () => {
        const run = singleRun(TestRunStatus.COMPLETED, {
            result: singleResult,
            startedAt: STARTED_AT,
            finishedAt: FINISHED_AT,
        });

        expect(toTestRunListItem(run)).toEqual({
            id: TEST_ID,
            type: TestType.SINGLE,
            status: TestRunStatus.COMPLETED,
            createdAt: CREATED_AT.toISOString(),
            startedAt: STARTED_AT.toISOString(),
            finishedAt: FINISHED_AT.toISOString(),
            request: { method: HttpMethod.POST, url: URL_TEMPLATE },
            load: singleLoad,
            summary: { ...resultTotals, ...targetMetrics },
        });
        expect(toTestRunResponse(run)).toMatchObject({
            request: { method: HttpMethod.POST, url: URL_TEMPLATE },
            load: singleLoad,
            summary: { ...resultTotals, ...targetMetrics },
            result: singleResult,
        });
    });

    it('maps a pending single run to request and load without a summary', () => {
        const item = toTestRunListItem(singleRun(TestRunStatus.PENDING));

        expect(item.request).toEqual({ method: HttpMethod.POST, url: URL_TEMPLATE });
        expect(item.load).toEqual(singleLoad);
        expect(item).not.toHaveProperty('summary');
        expect(warn).not.toHaveBeenCalled();
    });

    it('keeps network errors and omits response and service time without successful responses', () => {
        const run = singleRun(TestRunStatus.STOPPED, { result: networkErrorsResult });

        const { summary } = toTestRunListItem(run);

        expect(summary).toEqual({ ...resultTotals, ...networkErrorsMetrics });
        expect(summary).not.toHaveProperty('responseTime');
        expect(summary).not.toHaveProperty('serviceTime');
        expect(summary).not.toHaveProperty('statusCodes');
    });

    it('maps a scenario run to stepsCount and summary', () => {
        const run = scenarioRun({ summary: scenarioSummary, steps: [] });

        const item = toTestRunListItem(run);

        expect(item.stepsCount).toBe(2);
        expect(item.summary).toEqual(scenarioSummary);
        expect(item).not.toHaveProperty('request');
        expect(item).not.toHaveProperty('load');
    });

    it('keeps the reason and has no summary for a FAILED run', () => {
        const run = singleRun(TestRunStatus.FAILED, { reason: FAILURE_REASON });

        const item = toTestRunListItem(run);

        expect(item.reason).toBe(FAILURE_REASON);
        expect(item.load).toEqual(singleLoad);
        expect(item).not.toHaveProperty('summary');
        expect(warn).not.toHaveBeenCalled();
    });

    it('omits the summary and does not throw for a malformed result', () => {
        const malformed = { targetRps: 'fast', targets: [] };
        const run = singleRun(TestRunStatus.COMPLETED, { result: malformed });

        expect(() => toTestRunListItem(run)).not.toThrow();
        expect(toTestRunListItem(run)).not.toHaveProperty('summary');
        expect(warn).toHaveBeenCalled();
        const [message] = warn.mock.calls[0] as [string];
        expect(message).toContain(TEST_ID);
        expect(message).not.toContain('fast');
    });

    it('never exposes config headers or body', () => {
        const outputs = [
            toTestRunListItem(singleRun(TestRunStatus.COMPLETED, { result: singleResult })),
            toTestRunResponse(singleRun(TestRunStatus.COMPLETED, { result: singleResult })),
            toTestRunListItem(scenarioRun({ summary: scenarioSummary })),
            toTestRunResponse(scenarioRun({ summary: scenarioSummary })),
        ];

        for (const output of outputs) {
            const serialized = JSON.stringify(output);
            expect(serialized).not.toContain(SECRET_HEADER);
            expect(serialized).not.toContain(SECRET_BODY);
            expect(serialized).not.toContain('headers');
            expect(output).not.toHaveProperty('config');
        }
    });
});
