import { HttpStatus } from '@nestjs/common';
import { BaseException } from '@shared/error';
import { firstValueFrom, type Observable, Subject, toArray } from 'rxjs';

import { HttpMethod, LiveEventType, TestRunStatus, TestType } from '../../domain/constants';
import { TestRunErrorCodes } from '../../domain/errors';
import type { LiveEvent, LiveFeed } from '../../domain/ports';
import { TestRun } from '../../domain/test-run';
import { InMemoryTestRunsRepository } from '../../testing';
import { WatchTestRunUseCase } from './watch-test-run.use-case';

const TEST_ID = 'b3f1c2d4-7a1e-4f0b-9c3a-2e8d5f6a7b90';
const UNKNOWN_TEST_ID = '8c2a1f00-7a1e-4f0b-9c3a-2e8d5f6a7b90';
const OWNER_ID = '5d7e9a10-3c4b-4e2f-8a1d-6b9c0e2f4a13';
const OTHER_USER_ID = 'e1a2b3c4-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const FAILURE_REASON = 'bad config';
const FIRST_SNAPSHOT = { elapsedSeconds: 1 };
const SECOND_SNAPSHOT = { elapsedSeconds: 2 };

function restoreRun(status: TestRunStatus, reason?: string): TestRun {
    return TestRun.restore({
        id: TEST_ID,
        userId: OWNER_ID,
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

class DelayedSecondReadTestRunsRepository extends InMemoryTestRunsRepository {
    pendingRead?: Promise<void>;
    reads = 0;

    override async findByIdForUser(id: string, userId: string): Promise<TestRun | null> {
        this.reads += 1;
        const captured = super.findByIdForUser(id, userId);

        if (this.reads > 1) {
            await this.pendingRead;
        }

        return captured;
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
    let repository: DelayedSecondReadTestRunsRepository;
    let liveFeed: FakeLiveFeed;
    let useCase: WatchTestRunUseCase;

    beforeEach(() => {
        repository = new DelayedSecondReadTestRunsRepository();
        liveFeed = new FakeLiveFeed();
        useCase = new WatchTestRunUseCase(repository, liveFeed);
    });

    it('rejects an unknown id before returning a stream', async () => {
        repository.seed(restoreRun(TestRunStatus.RUNNING));

        const rejection = await useCase
            .execute(UNKNOWN_TEST_ID, OWNER_ID)
            .catch((error: unknown) => error);

        expect(rejection).toBeInstanceOf(BaseException);
        const exception = rejection as BaseException;
        expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect(exception.getResponse()).toMatchObject({ code: TestRunErrorCodes.NOT_FOUND });
    });

    it("rejects another user's run as not found before returning a stream", async () => {
        repository.seed(restoreRun(TestRunStatus.RUNNING));

        const rejection = await useCase
            .execute(TEST_ID, OTHER_USER_ID)
            .catch((error: unknown) => error);

        expect(rejection).toBeInstanceOf(BaseException);
        const exception = rejection as BaseException;
        expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect(exception.getResponse()).toMatchObject({ code: TestRunErrorCodes.NOT_FOUND });
        expect(liveFeed.events.observed).toBe(false);
    });

    it('emits one status event and completes for a final run', async () => {
        repository.seed(restoreRun(TestRunStatus.FAILED, FAILURE_REASON));

        const events = await collect(await useCase.execute(TEST_ID, OWNER_ID));

        expect(events).toEqual([statusEvent(TestRunStatus.FAILED, FAILURE_REASON)]);
    });

    it('emits the status, then snapshots, and completes on a final status', async () => {
        repository.seed(restoreRun(TestRunStatus.RUNNING));

        const collected = collect(await useCase.execute(TEST_ID, OWNER_ID));
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
        repository.seed(restoreRun(TestRunStatus.RUNNING));
        let finishSecondRead = (): void => undefined;
        repository.pendingRead = new Promise((resolve) => {
            finishSecondRead = resolve;
        });

        const collected = collect(await useCase.execute(TEST_ID, OWNER_ID));
        await flushMicrotasks();
        liveFeed.publishFinalStatus(TestRunStatus.STOPPED);
        finishSecondRead();

        await expect(collected).resolves.toEqual([
            statusEvent(TestRunStatus.RUNNING),
            statusEvent(TestRunStatus.STOPPED),
        ]);
    });

    it('stops watching the feed when the stream ends', async () => {
        repository.seed(restoreRun(TestRunStatus.COMPLETED));

        await collect(await useCase.execute(TEST_ID, OWNER_ID));

        expect(liveFeed.events.observed).toBe(false);
    });
});
