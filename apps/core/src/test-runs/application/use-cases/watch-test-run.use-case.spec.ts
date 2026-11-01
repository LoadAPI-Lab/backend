import { HttpStatus } from '@nestjs/common';
import { BaseException } from '@shared/error';
import { firstValueFrom, type Observable, Subject, toArray } from 'rxjs';

import { HttpMethod, LiveEventType, TestRunStatus, TestType } from '../../domain/constants';
import { TestRunErrorCodes } from '../../domain/errors';
import type { LiveEvent, LiveFeed } from '../../domain/ports';
import { TestRunsRepository } from '../../domain/repositories';
import { TestRun } from '../../domain/test-run';
import { WatchTestRunUseCase } from './watch-test-run.use-case';

const TEST_ID = 'b3f1c2d4-7a1e-4f0b-9c3a-2e8d5f6a7b90';
const UNKNOWN_TEST_ID = '8c2a1f00-7a1e-4f0b-9c3a-2e8d5f6a7b90';
const FAILURE_REASON = 'bad config';
const FIRST_SNAPSHOT = { elapsedSeconds: 1 };
const SECOND_SNAPSHOT = { elapsedSeconds: 2 };

function restoreRun(status: TestRunStatus, reason?: string): TestRun {
    return TestRun.restore({
        id: TEST_ID,
        type: TestType.SINGLE,
        status,
        config: {
            target: { method: HttpMethod.GET, url: 'https://api.example.com/users' },
            targetRps: 10,
            durationSeconds: 10,
        },
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        reason,
    });
}

const statusEvent = (status: TestRunStatus, reason?: string): LiveEvent => ({
    type: LiveEventType.STATUS,
    data: { status, reason },
});

const snapshotEvent = (data: unknown): LiveEvent => ({ type: LiveEventType.SNAPSHOT, data });

class FakeTestRunsRepository implements TestRunsRepository {
    stored?: TestRun;
    pendingRead?: Promise<void>;
    reads = 0;

    async create(): Promise<void> {}

    async findById(id: string): Promise<TestRun | undefined> {
        this.reads += 1;
        const captured = this.stored?.id === id ? this.stored : undefined;

        if (this.reads > 1) {
            await this.pendingRead;
        }

        return captured;
    }

    async updateIfStatus(): Promise<boolean> {
        return false;
    }

    async countActive(): Promise<number> {
        return 0;
    }

    async findActive(): Promise<TestRun[]> {
        return [];
    }

    async findPage(): Promise<TestRun[]> {
        return [];
    }
}

class FakeLiveFeed implements LiveFeed {
    readonly events = new Subject<LiveEvent>();

    watch(): Observable<LiveEvent> {
        return this.events;
    }

    publishStatus(_testId: string, status: TestRunStatus, reason?: string): void {
        this.events.next(statusEvent(status, reason));
    }

    publishFinalStatus(status: TestRunStatus, reason?: string): void {
        this.publishStatus(TEST_ID, status, reason);
        this.events.complete();
    }
}

const collect = (stream: Observable<LiveEvent>): Promise<LiveEvent[]> =>
    firstValueFrom(stream.pipe(toArray()));

const flushMicrotasks = (): Promise<void> =>
    new Promise((resolve) => {
        setImmediate(resolve);
    });

describe('WatchTestRunUseCase', () => {
    let repository: FakeTestRunsRepository;
    let liveFeed: FakeLiveFeed;
    let useCase: WatchTestRunUseCase;

    beforeEach(() => {
        repository = new FakeTestRunsRepository();
        liveFeed = new FakeLiveFeed();
        useCase = new WatchTestRunUseCase(repository, liveFeed);
    });

    it('rejects an unknown id before returning a stream', async () => {
        repository.stored = restoreRun(TestRunStatus.RUNNING);

        const rejection = await useCase.execute(UNKNOWN_TEST_ID).catch((error: unknown) => error);

        expect(rejection).toBeInstanceOf(BaseException);
        const exception = rejection as BaseException;
        expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect(exception.getResponse()).toMatchObject({ code: TestRunErrorCodes.NOT_FOUND });
    });

    it('emits one status event and completes for a final run', async () => {
        repository.stored = restoreRun(TestRunStatus.FAILED, FAILURE_REASON);

        const events = await collect(await useCase.execute(TEST_ID));

        expect(events).toEqual([statusEvent(TestRunStatus.FAILED, FAILURE_REASON)]);
    });

    it('emits the status, then snapshots, and completes on a final status', async () => {
        repository.stored = restoreRun(TestRunStatus.RUNNING);

        const collected = collect(await useCase.execute(TEST_ID));
        await flushMicrotasks();
        liveFeed.events.next(snapshotEvent(FIRST_SNAPSHOT));
        liveFeed.events.next(snapshotEvent(SECOND_SNAPSHOT));
        liveFeed.publishFinalStatus(TestRunStatus.COMPLETED);

        await expect(collected).resolves.toEqual([
            statusEvent(TestRunStatus.RUNNING),
            snapshotEvent(FIRST_SNAPSHOT),
            snapshotEvent(SECOND_SNAPSHOT),
            statusEvent(TestRunStatus.COMPLETED),
        ]);
    });

    it('completes when a final status is published during the second read', async () => {
        repository.stored = restoreRun(TestRunStatus.RUNNING);
        let finishSecondRead = (): void => undefined;
        repository.pendingRead = new Promise((resolve) => {
            finishSecondRead = resolve;
        });

        const collected = collect(await useCase.execute(TEST_ID));
        await flushMicrotasks();
        liveFeed.publishFinalStatus(TestRunStatus.STOPPED);
        finishSecondRead();

        await expect(collected).resolves.toEqual([
            statusEvent(TestRunStatus.RUNNING),
            statusEvent(TestRunStatus.STOPPED),
        ]);
    });

    it('stops watching the feed when the stream ends', async () => {
        repository.stored = restoreRun(TestRunStatus.COMPLETED);

        await collect(await useCase.execute(TEST_ID));

        expect(liveFeed.events.observed).toBe(false);
    });
});
