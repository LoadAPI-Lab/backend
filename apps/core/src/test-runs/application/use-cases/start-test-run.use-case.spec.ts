import type { ConfigService } from '@nestjs/config';
import { isBaseExceptionWithCode } from '@shared/error';

import { hashTestConfig } from '../../domain/config-hash';
import {
    CreateTestRunOutcome,
    HttpMethod,
    MAX_PAGE_LIMIT,
    TestRunStatus,
    TestType,
} from '../../domain/constants';
import { TestRunErrorCodes } from '../../domain/errors';
import type { TestJob, WorkerOrchestrator } from '../../domain/ports';
import type { TestConfigInput } from '../../domain/schemas';
import { TestRun } from '../../domain/test-run';
import { InMemoryTestRunsRepository } from '../../testing';
import { StartTestRunUseCase } from './start-test-run.use-case';

const OWNER_ID = '5d7e9a10-3c4b-4e2f-8a1d-6b9c0e2f4a13';
const OTHER_USER_ID = 'e1a2b3c4-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const IDEMPOTENCY_KEY = 'start-2026-11-08-a1b2c3';
const MAX_CONCURRENT_TESTS = 2;

const input: TestConfigInput = {
    type: TestType.SINGLE,
    config: {
        target: { method: HttpMethod.GET, url: 'https://api.example.com/users' },
        targetRps: 10,
        durationSeconds: 10,
    },
};

const otherInput: TestConfigInput = {
    type: TestType.SINGLE,
    config: { ...input.config, targetRps: 20 },
};

const storedRun = (
    status: TestRunStatus,
    { userId = OWNER_ID, idempotencyKey }: { userId?: string; idempotencyKey?: string } = {},
): TestRun =>
    TestRun.restore({
        id: crypto.randomUUID(),
        userId,
        type: input.type,
        status,
        config: input.config,
        configHash: hashTestConfig(input),
        idempotencyKey,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

class RecordingTestRunsRepository extends InMemoryTestRunsRepository {
    readonly created: TestRun[] = [];

    override async create(run: TestRun): Promise<CreateTestRunOutcome> {
        const outcome = await super.create(run);
        if (outcome === CreateTestRunOutcome.CREATED) {
            this.created.push(run);
        }
        return outcome;
    }
}

class ConcurrentInsertTestRunsRepository extends RecordingTestRunsRepository {
    private lookups = 0;

    override async findByIdempotencyKey(
        userId: string,
        idempotencyKey: string,
    ): Promise<TestRun | null> {
        this.lookups += 1;
        if (this.lookups === 1) {
            return null;
        }
        return super.findByIdempotencyKey(userId, idempotencyKey);
    }
}

class FakeWorkerOrchestrator implements WorkerOrchestrator {
    jobs: TestJob[] = [];

    async enqueue(job: TestJob): Promise<void> {
        this.jobs.push(job);
    }
}

const configService = {
    getOrThrow: () => MAX_CONCURRENT_TESTS,
} as unknown as ConfigService;

const isIdempotencyKeyReused = (error: unknown) =>
    isBaseExceptionWithCode(error, TestRunErrorCodes.IDEMPOTENCY_KEY_REUSED);

const storedRunsOf = async (repository: InMemoryTestRunsRepository, userId: string) =>
    repository.findPage({ userId, limit: MAX_PAGE_LIMIT });

describe('StartTestRunUseCase', () => {
    let orchestrator: FakeWorkerOrchestrator;

    const useCaseWith = (repository: InMemoryTestRunsRepository) =>
        new StartTestRunUseCase(repository, orchestrator, configService);

    beforeEach(() => {
        orchestrator = new FakeWorkerOrchestrator();
    });

    it('returns the same run for a repeated key with the same config and enqueues one job', async () => {
        const repository = new RecordingTestRunsRepository();
        const useCase = useCaseWith(repository);

        const first = await useCase.execute(input, OWNER_ID, IDEMPOTENCY_KEY);
        const second = await useCase.execute(input, OWNER_ID, IDEMPOTENCY_KEY);

        expect(second).toEqual(first);
        expect(await storedRunsOf(repository, OWNER_ID)).toHaveLength(1);
        expect(orchestrator.jobs).toEqual([{ testId: first.id, ...input }]);
    });

    it('rejects a repeated key with a different config and creates nothing', async () => {
        const repository = new RecordingTestRunsRepository().seed(
            storedRun(TestRunStatus.COMPLETED, { idempotencyKey: IDEMPOTENCY_KEY }),
        );

        await expect(
            useCaseWith(repository).execute(otherInput, OWNER_ID, IDEMPOTENCY_KEY),
        ).rejects.toSatisfy(isIdempotencyKeyReused);

        expect(repository.created).toEqual([]);
        expect(orchestrator.jobs).toEqual([]);
    });

    it('creates a new run on every call without a key', async () => {
        const repository = new RecordingTestRunsRepository();
        const useCase = useCaseWith(repository);

        const first = await useCase.execute(input, OWNER_ID);
        const second = await useCase.execute(input, OWNER_ID);

        expect(second.id).not.toBe(first.id);
        expect(repository.created.map((run) => run.configHash)).toEqual([
            hashTestConfig(input),
            hashTestConfig(input),
        ]);
        expect(orchestrator.jobs).toEqual([
            { testId: first.id, ...input },
            { testId: second.id, ...input },
        ]);
    });

    it('scopes keys per user and creates a run for each user', async () => {
        const repository = new RecordingTestRunsRepository();
        const useCase = useCaseWith(repository);

        const owner = await useCase.execute(input, OWNER_ID, IDEMPOTENCY_KEY);
        const other = await useCase.execute(input, OTHER_USER_ID, IDEMPOTENCY_KEY);

        expect(other.id).not.toBe(owner.id);
        expect(repository.created.map((run) => run.userId)).toEqual([OWNER_ID, OTHER_USER_ID]);
        expect(orchestrator.jobs).toHaveLength(2);
    });

    it('returns the existing run when the insert reports a key conflict and enqueues nothing', async () => {
        const existing = storedRun(TestRunStatus.PENDING, { idempotencyKey: IDEMPOTENCY_KEY });
        const repository = new ConcurrentInsertTestRunsRepository().seed(existing);

        const response = await useCaseWith(repository).execute(input, OWNER_ID, IDEMPOTENCY_KEY);

        expect(response).toEqual({ id: existing.id, status: TestRunStatus.PENDING });
        expect(repository.created).toEqual([]);
        expect(orchestrator.jobs).toEqual([]);
    });

    it('replays a key without checking the capacity', async () => {
        const existing = storedRun(TestRunStatus.RUNNING, { idempotencyKey: IDEMPOTENCY_KEY });
        const repository = new RecordingTestRunsRepository().seed(
            existing,
            ...Array.from({ length: MAX_CONCURRENT_TESTS }, () =>
                storedRun(TestRunStatus.PENDING, { userId: OTHER_USER_ID }),
            ),
        );

        const response = await useCaseWith(repository).execute(input, OWNER_ID, IDEMPOTENCY_KEY);

        expect(response).toEqual({ id: existing.id, status: TestRunStatus.RUNNING });
        expect(repository.created).toEqual([]);
        expect(orchestrator.jobs).toEqual([]);
    });
});
