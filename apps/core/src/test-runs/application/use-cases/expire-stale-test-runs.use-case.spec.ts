import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpMethod } from '@shared/constants';
import { EMPTY, type Observable } from 'rxjs';

import { TestRunFailureReason, TestRunStatus, TestType } from '../../domain/constants';
import type { LiveEvent, LiveFeed, TestRunStopper } from '../../domain/ports';
import type { ScenarioConfig, SingleConfig } from '../../domain/schemas';
import { TestRun } from '../../domain/test-run';
import { InMemoryTestRunsRepository } from '../../testing';
import { ExpireStaleTestRunsUseCase } from './expire-stale-test-runs.use-case';

const FIRST_ID = 'b3f1c2d4-7a1e-4f0b-9c3a-2e8d5f6a7b90';
const SECOND_ID = '8c2a1f00-7a1e-4f0b-9c3a-2e8d5f6a7b90';

const OWNER_ID = '5d7e9a10-3c4b-4e2f-8a1d-6b9c0e2f4a13';

const PENDING_TIMEOUT_MS = 30_000;
const RUNNING_GRACE_MS = 30_000;
const REQUEST_TIMEOUT_MS = 10_000;
const DURATION_SECONDS = 10;
const SCENARIO_STEPS = 3;

const SINGLE_MAX_RUNNING_MS = DURATION_SECONDS * 1000 + REQUEST_TIMEOUT_MS + RUNNING_GRACE_MS;
const SCENARIO_MAX_RUNNING_MS = SCENARIO_STEPS * REQUEST_TIMEOUT_MS + RUNNING_GRACE_MS;
const JUST_OVER_MS = 1;

const SENSITIVE_DETAIL = 'params: Authorization Bearer secret';

const CREATED_AT = new Date('2026-01-01T00:00:00.000Z');
const STARTED_AT = new Date('2026-01-01T00:01:00.000Z');

const TARGET = { method: HttpMethod.GET, url: 'https://api.example.com/users' };
const SINGLE_CONFIG: SingleConfig = {
    target: TARGET,
    targetRps: 10,
    durationSeconds: DURATION_SECONDS,
};
const SCENARIO_CONFIG: ScenarioConfig = {
    steps: Array.from({ length: SCENARIO_STEPS }, () => ({ target: TARGET })),
};

const after = (base: Date, ms: number): Date => new Date(base.getTime() + ms);

const pendingRun = (id = FIRST_ID): TestRun =>
    TestRun.restore({
        id,
        userId: OWNER_ID,
        type: TestType.SINGLE,
        status: TestRunStatus.PENDING,
        config: SINGLE_CONFIG,
        createdAt: CREATED_AT,
    });

const runningSingle = (id = FIRST_ID): TestRun =>
    TestRun.restore({
        id,
        userId: OWNER_ID,
        type: TestType.SINGLE,
        status: TestRunStatus.RUNNING,
        config: SINGLE_CONFIG,
        createdAt: CREATED_AT,
        startedAt: STARTED_AT,
    });

const runningScenario = (): TestRun =>
    TestRun.restore({
        id: FIRST_ID,
        userId: OWNER_ID,
        type: TestType.SCENARIO,
        status: TestRunStatus.RUNNING,
        config: SCENARIO_CONFIG,
        createdAt: CREATED_AT,
        startedAt: STARTED_AT,
    });

class RecordingTestRunsRepository extends InMemoryTestRunsRepository {
    readonly updates: { id: string; status: TestRunStatus; expected: TestRunStatus }[] = [];

    constructor(private readonly callOrder: string[]) {
        super();
    }

    override async updateIfStatus(run: TestRun, expected: TestRunStatus): Promise<boolean> {
        this.callOrder.push('update');
        this.updates.push({ id: run.id, status: run.status, expected });
        return super.updateIfStatus(run, expected);
    }
}

class FakeTestRunStopper implements TestRunStopper {
    stopped: string[] = [];
    failingIds = new Set<string>();

    constructor(private readonly callOrder: string[]) {}

    async requestStop(testId: string): Promise<void> {
        this.callOrder.push('stop');
        if (this.failingIds.has(testId)) {
            throw new Error(SENSITIVE_DETAIL);
        }
        this.stopped.push(testId);
    }
}

class FakeLiveFeed implements LiveFeed {
    published: { testId: string; status: TestRunStatus; reason?: string }[] = [];

    watch(): Observable<LiveEvent> {
        return EMPTY;
    }

    publishStatus(testId: string, status: TestRunStatus, reason?: string): void {
        this.published.push({ testId, status, reason });
    }
}

describe('ExpireStaleTestRunsUseCase', () => {
    let callOrder: string[];
    let repository: RecordingTestRunsRepository;
    let stopper: FakeTestRunStopper;
    let liveFeed: FakeLiveFeed;
    let useCase: ExpireStaleTestRunsUseCase;

    beforeEach(() => {
        callOrder = [];
        repository = new RecordingTestRunsRepository(callOrder);
        stopper = new FakeTestRunStopper(callOrder);
        liveFeed = new FakeLiveFeed();
        useCase = new ExpireStaleTestRunsUseCase(
            repository,
            stopper,
            liveFeed,
            new ConfigService({
                PENDING_TIMEOUT_MS,
                RUNNING_GRACE_MS,
                WORKER_REQUEST_TIMEOUT_MS: REQUEST_TIMEOUT_MS,
            }),
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('leaves a pending run within the timeout untouched', async () => {
        repository.seed(pendingRun());

        await expect(useCase.execute(after(CREATED_AT, PENDING_TIMEOUT_MS))).resolves.toBe(0);

        expect(stopper.stopped).toEqual([]);
        expect(repository.updates).toEqual([]);
        expect(liveFeed.published).toEqual([]);
    });

    it('fails a pending run past the timeout and requests a stop first', async () => {
        repository.seed(pendingRun());
        const now = after(CREATED_AT, PENDING_TIMEOUT_MS + JUST_OVER_MS);

        await expect(useCase.execute(now)).resolves.toBe(1);

        expect(callOrder).toEqual(['stop', 'update']);
        expect(stopper.stopped).toEqual([FIRST_ID]);
        expect(repository.updates).toEqual([
            { id: FIRST_ID, status: TestRunStatus.FAILED, expected: TestRunStatus.PENDING },
        ]);
        const run = await repository.findById(FIRST_ID);
        expect(run?.reason).toBe(TestRunFailureReason.NO_WORKER);
        expect(run?.finishedAt).toEqual(now);
        expect(liveFeed.published).toEqual([
            {
                testId: FIRST_ID,
                status: TestRunStatus.FAILED,
                reason: TestRunFailureReason.NO_WORKER,
            },
        ]);
    });

    it('leaves a running single test within duration, timeout and grace untouched', async () => {
        repository.seed(runningSingle());

        await expect(useCase.execute(after(STARTED_AT, SINGLE_MAX_RUNNING_MS))).resolves.toBe(0);

        expect(stopper.stopped).toEqual([]);
        expect(repository.updates).toEqual([]);
    });

    it('fails a running single test past duration, timeout and grace', async () => {
        repository.seed(runningSingle());
        const now = after(STARTED_AT, SINGLE_MAX_RUNNING_MS + JUST_OVER_MS);

        await expect(useCase.execute(now)).resolves.toBe(1);

        expect(stopper.stopped).toEqual([FIRST_ID]);
        expect(repository.updates).toEqual([
            { id: FIRST_ID, status: TestRunStatus.FAILED, expected: TestRunStatus.RUNNING },
        ]);
        const run = await repository.findById(FIRST_ID);
        expect(run?.reason).toBe(TestRunFailureReason.RESULT_NOT_REPORTED);
    });

    it('limits a scenario by steps times the request timeout plus grace', async () => {
        repository.seed(runningScenario());

        await expect(useCase.execute(after(STARTED_AT, SCENARIO_MAX_RUNNING_MS))).resolves.toBe(0);
        expect(stopper.stopped).toEqual([]);

        await expect(
            useCase.execute(after(STARTED_AT, SCENARIO_MAX_RUNNING_MS + JUST_OVER_MS)),
        ).resolves.toBe(1);
        expect(stopper.stopped).toEqual([FIRST_ID]);
    });

    it('publishes nothing when the consumer finished the run first', async () => {
        repository.seed(pendingRun());
        repository.rejectUpdates = true;

        await expect(
            useCase.execute(after(CREATED_AT, PENDING_TIMEOUT_MS + JUST_OVER_MS)),
        ).resolves.toBe(0);

        expect(liveFeed.published).toEqual([]);
    });

    it('keeps expiring the other runs when one throws, without logging error details', async () => {
        const logError = vi.spyOn(Logger.prototype, 'error').mockReturnValue();
        repository.seed(pendingRun(FIRST_ID), pendingRun(SECOND_ID));
        stopper.failingIds.add(FIRST_ID);

        await expect(
            useCase.execute(after(CREATED_AT, PENDING_TIMEOUT_MS + JUST_OVER_MS)),
        ).resolves.toBe(1);

        expect(stopper.stopped).toEqual([SECOND_ID]);
        expect(liveFeed.published.map(({ testId }) => testId)).toEqual([SECOND_ID]);
        expect(logError).toHaveBeenCalledOnce();
        expect(logError.mock.calls[0]?.[0]).toContain(FIRST_ID);
        expect(logError.mock.calls[0]?.[0]).not.toContain(SENSITIVE_DETAIL);
    });
});
