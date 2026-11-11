import { HttpMethod } from '@shared/constants';
import { EMPTY } from 'rxjs';

import { TestRunStatus, TestType, WorkerEventType } from '../../domain/constants';
import type { LiveFeed } from '../../domain/ports';
import type { SingleConfig } from '../../domain/schemas';
import { TestRun } from '../../domain/test-run';
import { InMemoryTestRunsRepository } from '../../testing';
import type { FinishedEvent, StartedEvent } from '../dtos';
import { HandleWorkerEventUseCase, WorkerEventOutcome } from './handle-worker-event.use-case';

const TEST_ID = 'b3f1c2d4-7a1e-4f0b-9c3a-2e8d5f6a7b90';
const UNKNOWN_TEST_ID = '8c2a1f00-7a1e-4f0b-9c3a-2e8d5f6a7b90';
const OWNER_ID = '5d7e9a10-3c4b-4e2f-8a1d-6b9c0e2f4a13';

const SINGLE_CONFIG: SingleConfig = {
    target: { method: HttpMethod.GET, url: 'https://api.example.com/users' },
    targetRps: 10,
    durationSeconds: 10,
};

const CREATED_AT = new Date('2026-01-01T00:00:00.000Z');
const STORED_STARTED_AT = new Date('2026-01-01T00:01:00.000Z');
const EVENT_STARTED_AT = new Date('2026-01-01T00:01:30.000Z');
const FINISHED_AT = new Date('2026-01-01T00:02:00.000Z');
const RESULT = { durationMs: 60_000 };

const STARTED_EVENT: StartedEvent = {
    testId: TEST_ID,
    testType: TestType.SINGLE,
    eventType: WorkerEventType.STARTED,
    timestamp: EVENT_STARTED_AT,
};

const FINISHED_BASE = {
    testId: TEST_ID,
    testType: TestType.SINGLE,
    eventType: WorkerEventType.FINISHED,
    startedAt: EVENT_STARTED_AT,
    finishedAt: FINISHED_AT,
} as const;

const COMPLETED_EVENT: FinishedEvent = {
    ...FINISHED_BASE,
    status: TestRunStatus.COMPLETED,
    result: RESULT,
};
const FAILED_EVENT: FinishedEvent = {
    ...FINISHED_BASE,
    status: TestRunStatus.FAILED,
    reason: 'bad config',
};

function restoreRun(status: TestRunStatus, result?: unknown): TestRun {
    return TestRun.restore({
        id: TEST_ID,
        userId: OWNER_ID,
        type: TestType.SINGLE,
        status,
        config: SINGLE_CONFIG,
        createdAt: CREATED_AT,
        startedAt: status === TestRunStatus.PENDING ? undefined : STORED_STARTED_AT,
        result,
    });
}

const noopLiveFeed: LiveFeed = {
    watch: () => EMPTY,
    publishStatus: vi.fn(),
};

describe('HandleWorkerEventUseCase', () => {
    let repository: InMemoryTestRunsRepository;
    let useCase: HandleWorkerEventUseCase;

    beforeEach(() => {
        repository = new InMemoryTestRunsRepository();
        useCase = new HandleWorkerEventUseCase(repository, noopLiveFeed);
    });

    it('applies started on a PENDING run and moves it to RUNNING', async () => {
        repository.seed(restoreRun(TestRunStatus.PENDING));

        await expect(useCase.execute(STARTED_EVENT)).resolves.toBe(WorkerEventOutcome.APPLIED);

        const stored = await repository.findById(TEST_ID);
        expect(stored?.status).toBe(TestRunStatus.RUNNING);
        expect(stored?.startedAt).toEqual(EVENT_STARTED_AT);
    });

    it('ignores a duplicate started', async () => {
        repository.seed(restoreRun(TestRunStatus.PENDING));
        await useCase.execute(STARTED_EVENT);

        await expect(useCase.execute(STARTED_EVENT)).resolves.toBe(WorkerEventOutcome.IGNORED);

        const stored = await repository.findById(TEST_ID);
        expect(stored?.status).toBe(TestRunStatus.RUNNING);
    });

    it('ignores started after FAILED', async () => {
        repository.seed(restoreRun(TestRunStatus.FAILED));

        await expect(useCase.execute(STARTED_EVENT)).resolves.toBe(WorkerEventOutcome.IGNORED);

        const stored = await repository.findById(TEST_ID);
        expect(stored?.status).toBe(TestRunStatus.FAILED);
    });

    it('applies finished COMPLETED from RUNNING and stores the result', async () => {
        repository.seed(restoreRun(TestRunStatus.RUNNING));

        await expect(useCase.execute(COMPLETED_EVENT)).resolves.toBe(WorkerEventOutcome.APPLIED);

        const stored = await repository.findById(TEST_ID);
        expect(stored?.status).toBe(TestRunStatus.COMPLETED);
        expect(stored?.result).toEqual(RESULT);
        expect(stored?.finishedAt).toEqual(FINISHED_AT);
    });

    it('applies finished from PENDING and takes startedAt from the event', async () => {
        repository.seed(restoreRun(TestRunStatus.PENDING));

        await expect(useCase.execute(COMPLETED_EVENT)).resolves.toBe(WorkerEventOutcome.APPLIED);

        const stored = await repository.findById(TEST_ID);
        expect(stored?.status).toBe(TestRunStatus.COMPLETED);
        expect(stored?.startedAt).toEqual(EVENT_STARTED_AT);
    });

    it('ignores finished after a final status and keeps the result', async () => {
        const storedResult = { durationMs: 1 };
        repository.seed(restoreRun(TestRunStatus.COMPLETED, storedResult));

        await expect(useCase.execute(COMPLETED_EVENT)).resolves.toBe(WorkerEventOutcome.IGNORED);

        const stored = await repository.findById(TEST_ID);
        expect(stored?.status).toBe(TestRunStatus.COMPLETED);
        expect(stored?.result).toEqual(storedResult);
    });

    it('keeps the reason of a FAILED event', async () => {
        repository.seed(restoreRun(TestRunStatus.RUNNING));

        await expect(useCase.execute(FAILED_EVENT)).resolves.toBe(WorkerEventOutcome.APPLIED);

        const stored = await repository.findById(TEST_ID);
        expect(stored?.status).toBe(TestRunStatus.FAILED);
        expect(stored?.reason).toBe('bad config');
    });

    it('reports an unknown test run', async () => {
        await expect(useCase.execute({ ...STARTED_EVENT, testId: UNKNOWN_TEST_ID })).resolves.toBe(
            WorkerEventOutcome.UNKNOWN_TEST_RUN,
        );
    });

    it('ignores the event when updateIfStatus returns false', async () => {
        repository.seed(restoreRun(TestRunStatus.PENDING));
        repository.rejectUpdates = true;

        await expect(useCase.execute(STARTED_EVENT)).resolves.toBe(WorkerEventOutcome.IGNORED);

        const stored = await repository.findById(TEST_ID);
        expect(stored?.status).toBe(TestRunStatus.PENDING);
    });
});
