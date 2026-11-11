import { Logger } from '@nestjs/common';
import { HttpMethod } from '@shared/constants';

import { MASKED_VALUE, StepStatus, TestRunStatus, TestType } from '../../domain/constants';
import { TestRun } from '../../domain/test-run';
import { toTestRunListItem, toTestRunResponse } from './test-run-response.mapper';

const TEST_ID = 'b3f1c2d4-7a1e-4f0b-9c3a-2e8d5f6a7b90';
const USER_ID = '5d7e9a10-3c4b-4e2f-8a1d-6b9c0e2f4a13';
const URL_TEMPLATE = 'https://api.example.com/users/{{userId}}?q={{$randomInt}}';
const SECRET_HEADER = 'Bearer super-secret-token';
const SECRET_BODY = 'password=hunter2';
const SECRET_QUERY_VALUE = 'leaked-query-secret';
const FAILURE_REASON = 'invalid single test config';
const CREATED_AT = new Date('2026-01-01T00:00:00.000Z');
const STARTED_AT = new Date('2026-01-01T00:01:00.000Z');
const FINISHED_AT = new Date('2026-01-01T00:02:00.000Z');
const RESULT_URL = 'https://api.example.com/users/1';
const SECRET_RESULT_URL = `https://api.example.com/users?api_key=${SECRET_QUERY_VALUE}&page=2`;
const MASKED_RESULT_URL = `https://api.example.com/users?api_key=${MASKED_VALUE}&page=2`;
const TARGET_RPS = 500;
const DURATION_SECONDS = 60;
const RAMP_UP_SECONDS = 10;
const P95_MS = 190.2;
const STEPS_COUNT = 2;
const OK_COUNT = 1;
const LIST_ONLY_KEYS = ['request', 'load', 'summary', 'targetRps', 'p95Ms', 'stepsCount'];
const DETAILS_ONLY_KEYS = ['config', 'result', 'headers', 'body', 'summary', 'load'];

const singleTarget = {
    method: HttpMethod.POST,
    url: URL_TEMPLATE,
    headers: { Authorization: SECRET_HEADER },
    body: SECRET_BODY,
};

const maskedSingleTarget = {
    ...singleTarget,
    headers: { Authorization: `Bearer ${MASKED_VALUE}` },
};

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
    responseTime: { p50Ms: 22.8, p95Ms: P95_MS, p99Ms: 455 },
    serviceTime: { p50Ms: 22.5, p95Ms: 186.7, p99Ms: 431.9 },
    statusCodes: { '201': 29_100, '500': 690 },
    errors: { timeout: 80 },
};

const singleResult = {
    ...resultTotals,
    targets: [{ method: HttpMethod.POST, url: RESULT_URL, ...targetMetrics }],
};

const networkErrorsResult = {
    ...resultTotals,
    targets: [
        {
            method: HttpMethod.POST,
            url: RESULT_URL,
            totalRequests: 120,
            successCount: 0,
            errorCount: 120,
            errorRate: 1,
            lateCount: 0,
            errors: { connection_refused: 120 },
        },
    ],
};

const scenarioResult = {
    summary: {
        totalSteps: STEPS_COUNT,
        okCount: OK_COUNT,
        failedCount: 1,
        skippedCount: 0,
        durationMs: 150.3,
    },
    steps: [
        {
            method: HttpMethod.POST,
            url: RESULT_URL,
            status: StepStatus.OK,
            statusCode: 200,
            durationMs: 112.4,
        },
        {
            method: HttpMethod.GET,
            url: RESULT_URL,
            status: StepStatus.FAILED,
            statusCode: 500,
            durationMs: 37.9,
            description: 'unexpected status 500',
        },
    ],
};

const scenarioSteps = [
    { target: singleTarget, extract: [{ name: 'userId', path: 'data.id' }] },
    { target: { method: HttpMethod.GET, url: URL_TEMPLATE } },
];

interface RunExtra {
    result?: unknown;
    reason?: string;
    startedAt?: Date;
    finishedAt?: Date;
}

const singleRun = (status: TestRunStatus, extra: RunExtra = {}) =>
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
        config: { steps: scenarioSteps },
        createdAt: CREATED_AT,
        startedAt: STARTED_AT,
        finishedAt: FINISHED_AT,
        result,
    });

const completedSingleRun = (result: unknown) =>
    singleRun(TestRunStatus.COMPLETED, {
        result,
        startedAt: STARTED_AT,
        finishedAt: FINISHED_AT,
    });

describe('test run response mapper', () => {
    let warn: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('list item', () => {
        it('maps a completed single run to request, targetRps, durationSeconds and p95Ms', () => {
            expect(toTestRunListItem(completedSingleRun(singleResult))).toEqual({
                id: TEST_ID,
                type: TestType.SINGLE,
                status: TestRunStatus.COMPLETED,
                createdAt: CREATED_AT.toISOString(),
                startedAt: STARTED_AT.toISOString(),
                finishedAt: FINISHED_AT.toISOString(),
                request: { method: HttpMethod.POST, url: URL_TEMPLATE },
                targetRps: TARGET_RPS,
                durationSeconds: DURATION_SECONDS,
                p95Ms: P95_MS,
            });
        });

        it('has no p95Ms for a single run with only network errors', () => {
            const item = toTestRunListItem(
                singleRun(TestRunStatus.STOPPED, { result: networkErrorsResult }),
            );

            expect(item.targetRps).toBe(TARGET_RPS);
            expect(item).not.toHaveProperty('p95Ms');
            expect(warn).not.toHaveBeenCalled();
        });

        it('has no p95Ms for a pending single run', () => {
            const item = toTestRunListItem(singleRun(TestRunStatus.PENDING));

            expect(item.request).toEqual({ method: HttpMethod.POST, url: URL_TEMPLATE });
            expect(item.durationSeconds).toBe(DURATION_SECONDS);
            expect(item).not.toHaveProperty('p95Ms');
            expect(warn).not.toHaveBeenCalled();
        });

        it('maps a scenario run to stepsCount and okCount', () => {
            const item = toTestRunListItem(scenarioRun(scenarioResult));

            expect(item.stepsCount).toBe(STEPS_COUNT);
            expect(item.okCount).toBe(OK_COUNT);
            expect(item).not.toHaveProperty('request');
            expect(item).not.toHaveProperty('targetRps');
            expect(item).not.toHaveProperty('p95Ms');
        });

        it('keeps the reason of a FAILED run', () => {
            const item = toTestRunListItem(
                singleRun(TestRunStatus.FAILED, { reason: FAILURE_REASON }),
            );

            expect(item.reason).toBe(FAILURE_REASON);
            expect(item).not.toHaveProperty('p95Ms');
            expect(warn).not.toHaveBeenCalled();
        });

        it('never includes config, headers, body, summary or result', () => {
            const items = [
                toTestRunListItem(completedSingleRun(singleResult)),
                toTestRunListItem(singleRun(TestRunStatus.FAILED, { reason: FAILURE_REASON })),
                toTestRunListItem(scenarioRun(scenarioResult)),
            ];

            for (const item of items) {
                for (const key of DETAILS_ONLY_KEYS) {
                    expect(item).not.toHaveProperty(key);
                }
                const serialized = JSON.stringify(item);
                expect(serialized).not.toContain(SECRET_HEADER);
                expect(serialized).not.toContain(SECRET_BODY);
            }
        });
    });

    describe('details', () => {
        it('returns the masked config and the typed result without list-only fields', () => {
            const single = toTestRunResponse(completedSingleRun(singleResult));
            const scenario = toTestRunResponse(scenarioRun(scenarioResult));

            expect(single).toEqual({
                id: TEST_ID,
                type: TestType.SINGLE,
                status: TestRunStatus.COMPLETED,
                createdAt: CREATED_AT.toISOString(),
                startedAt: STARTED_AT.toISOString(),
                finishedAt: FINISHED_AT.toISOString(),
                config: { target: maskedSingleTarget, ...singleLoad },
                result: singleResult,
            });
            expect(scenario.config).toEqual({
                steps: [{ ...scenarioSteps[0], target: maskedSingleTarget }, scenarioSteps[1]],
            });
            expect(scenario.result).toEqual(scenarioResult);
            for (const response of [single, scenario]) {
                for (const key of LIST_ONLY_KEYS) {
                    expect(response).not.toHaveProperty(key);
                }
                expect(JSON.stringify(response)).not.toContain(SECRET_HEADER);
            }
        });

        it('masks secret query parameters in result URLs', () => {
            const single = toTestRunResponse(
                completedSingleRun({
                    ...singleResult,
                    targets: [{ ...singleResult.targets[0], url: SECRET_RESULT_URL }],
                }),
            );
            const scenario = toTestRunResponse(
                scenarioRun({
                    ...scenarioResult,
                    steps: scenarioResult.steps.map((step) => ({
                        ...step,
                        url: SECRET_RESULT_URL,
                    })),
                }),
            );

            expect(single.result).toMatchObject({ targets: [{ url: MASKED_RESULT_URL }] });
            expect(scenario.result).toMatchObject({
                steps: [{ url: MASKED_RESULT_URL }, { url: MASKED_RESULT_URL }],
            });
            for (const response of [single, scenario]) {
                expect(JSON.stringify(response)).not.toContain(SECRET_QUERY_VALUE);
            }
        });
    });

    it('omits a malformed result without throwing and warns with the test id only', () => {
        const malformedValue = 'fast';
        const run = completedSingleRun({ targetRps: malformedValue, targets: [] });

        expect(() => toTestRunResponse(run)).not.toThrow();
        expect(toTestRunResponse(run)).not.toHaveProperty('result');
        expect(() => toTestRunListItem(run)).not.toThrow();
        expect(toTestRunListItem(run)).not.toHaveProperty('p95Ms');
        expect(warn).toHaveBeenCalled();
        for (const [message] of warn.mock.calls as [string][]) {
            expect(message).toContain(TEST_ID);
            expect(message).not.toContain(malformedValue);
        }
    });
});
