import { TEST_RUN_STATUSES, type TestRunStatus } from './constants';
import { TestRun } from './test-run';

const CREATED_AT = new Date('2026-01-01T00:00:00.000Z');
const STARTED_AT = new Date('2026-01-01T00:01:00.000Z');
const FINISHED_AT = new Date('2026-01-01T00:02:00.000Z');

function startedAtFor(status: TestRunStatus): Date | undefined {
    if (status === 'PENDING') {
        return undefined;
    }
    return STARTED_AT;
}

function restoreWith(
    status: TestRunStatus,
    overrides: Partial<{
        reason: string | undefined;
        result: unknown;
        startedAt: Date | undefined;
        finishedAt: Date | undefined;
    }> = {},
): TestRun {
    return TestRun.restore({
        id: 'fixed-id',
        type: 'single',
        status,
        config: { foo: 'bar' },
        createdAt: CREATED_AT,
        startedAt: startedAtFor(status),
        ...overrides,
    });
}

type FinishTarget = 'COMPLETED' | 'FAILED' | 'STOPPED';

function finishInputFor(target: FinishTarget) {
    if (target === 'FAILED') {
        return { status: 'FAILED' as const, reason: 'worker crashed', finishedAt: FINISHED_AT };
    }
    return { status: target, result: { ok: true }, finishedAt: FINISHED_AT };
}

describe('TestRun', () => {
    describe('create', () => {
        it('starts PENDING with the given config and createdAt', () => {
            const now = new Date('2026-02-01T10:00:00.000Z');
            const run = TestRun.create({ type: 'scenario', config: { steps: [] }, now });

            expect(run.status).toBe('PENDING');
            expect(run.type).toBe('scenario');
            expect(run.config).toEqual({ steps: [] });
            expect(run.createdAt).toBe(now);
            expect(run.startedAt).toBeUndefined();
            expect(run.finishedAt).toBeUndefined();
            expect(run.id).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
            );
        });

        it('defaults createdAt to now when not given', () => {
            const before = Date.now();
            const run = TestRun.create({ type: 'single', config: {} });
            const after = Date.now();

            expect(run.createdAt.getTime()).toBeGreaterThanOrEqual(before);
            expect(run.createdAt.getTime()).toBeLessThanOrEqual(after);
        });
    });

    describe('markStarted', () => {
        it.each(TEST_RUN_STATUSES)('from %s', (status) => {
            const run = restoreWith(status);
            const previousStartedAt = run.startedAt;

            const result = run.markStarted(STARTED_AT);

            if (status === 'PENDING') {
                expect(result).toBe(true);
                expect(run.status).toBe('RUNNING');
                expect(run.startedAt).toBe(STARTED_AT);
            } else {
                expect(result).toBe(false);
                expect(run.status).toBe(status);
                expect(run.startedAt).toBe(previousStartedAt);
            }
        });

        it('is idempotent once RUNNING', () => {
            const run = restoreWith('PENDING');
            const second = new Date('2026-01-01T00:05:00.000Z');

            expect(run.markStarted(STARTED_AT)).toBe(true);
            expect(run.markStarted(second)).toBe(false);
            expect(run.status).toBe('RUNNING');
            expect(run.startedAt).toBe(STARTED_AT);
        });
    });

    describe('finish', () => {
        const targets: readonly FinishTarget[] = ['COMPLETED', 'STOPPED', 'FAILED'];

        for (const target of targets) {
            it.each(TEST_RUN_STATUSES)(`from %s to ${target}`, (status) => {
                const run = restoreWith(status);
                const input = finishInputFor(target);

                const result = run.finish(input);
                const allowed = status === 'PENDING' || status === 'RUNNING';

                if (allowed) {
                    expect(result).toBe(true);
                    expect(run.status).toBe(target);
                    expect(run.finishedAt).toBe(FINISHED_AT);
                    if (target === 'FAILED') {
                        expect(run.reason).toBe('worker crashed');
                        expect(run.result).toBeUndefined();
                    } else {
                        expect(run.result).toEqual({ ok: true });
                        expect(run.reason).toBeUndefined();
                    }
                } else {
                    expect(result).toBe(false);
                    expect(run.status).toBe(status);
                    expect(run.finishedAt).not.toBe(FINISHED_AT);
                }
            });
        }

        it('fills startedAt when it was not set yet', () => {
            const run = restoreWith('PENDING');

            const result = run.finish({
                status: 'COMPLETED',
                result: {},
                finishedAt: FINISHED_AT,
                startedAt: STARTED_AT,
            });

            expect(result).toBe(true);
            expect(run.startedAt).toBe(STARTED_AT);
        });

        it('leaves startedAt unset when finish is called without one and none was set', () => {
            const run = restoreWith('PENDING');

            run.finish({ status: 'COMPLETED', result: {}, finishedAt: FINISHED_AT });

            expect(run.startedAt).toBeUndefined();
        });

        it('never overwrites an already-set startedAt', () => {
            const run = restoreWith('RUNNING');
            const otherStartedAt = new Date('2026-01-01T00:09:00.000Z');

            run.finish({
                status: 'COMPLETED',
                result: {},
                finishedAt: FINISHED_AT,
                startedAt: otherStartedAt,
            });

            expect(run.startedAt).toBe(STARTED_AT);
        });

        it.each(['', '   '])('throws for FAILED with reason %j', (reason) => {
            const run = restoreWith('RUNNING');

            expect(() =>
                run.finish({ status: 'FAILED', reason, finishedAt: FINISHED_AT }),
            ).toThrow();
        });

        it('never overwrites a final status', () => {
            const run = restoreWith('COMPLETED', { result: { first: true } });

            const result = run.finish({
                status: 'STOPPED',
                result: { second: true },
                finishedAt: FINISHED_AT,
            });

            expect(result).toBe(false);
            expect(run.status).toBe('COMPLETED');
            expect(run.result).toEqual({ first: true });
        });
    });

    describe('isStuck', () => {
        const maxRunningMs = 60_000;

        it.each(TEST_RUN_STATUSES)('is false for %s when not RUNNING', (status) => {
            if (status === 'RUNNING') {
                return;
            }
            const run = restoreWith(status);
            const now = new Date(STARTED_AT.getTime() + maxRunningMs + 1);

            expect(run.isStuck(now, maxRunningMs)).toBe(false);
        });

        it('is false exactly at the boundary', () => {
            const run = restoreWith('RUNNING');
            const now = new Date(STARTED_AT.getTime() + maxRunningMs);

            expect(run.isStuck(now, maxRunningMs)).toBe(false);
        });

        it('is true just past the boundary', () => {
            const run = restoreWith('RUNNING');
            const now = new Date(STARTED_AT.getTime() + maxRunningMs + 1);

            expect(run.isStuck(now, maxRunningMs)).toBe(true);
        });
    });

    describe('isPendingTooLong', () => {
        const maxPendingMs = 30_000;

        it.each(TEST_RUN_STATUSES)('is false for %s when not PENDING', (status) => {
            if (status === 'PENDING') {
                return;
            }
            const run = restoreWith(status);
            const now = new Date(CREATED_AT.getTime() + maxPendingMs + 1);

            expect(run.isPendingTooLong(now, maxPendingMs)).toBe(false);
        });

        it('is false exactly at the boundary', () => {
            const run = restoreWith('PENDING');
            const now = new Date(CREATED_AT.getTime() + maxPendingMs);

            expect(run.isPendingTooLong(now, maxPendingMs)).toBe(false);
        });

        it('is true just past the boundary', () => {
            const run = restoreWith('PENDING');
            const now = new Date(CREATED_AT.getTime() + maxPendingMs + 1);

            expect(run.isPendingTooLong(now, maxPendingMs)).toBe(true);
        });
    });
});
