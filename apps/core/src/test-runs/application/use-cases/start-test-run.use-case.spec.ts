import type { ConfigService } from '@nestjs/config';
import { isBaseExceptionWithCode } from '@shared/error';

import { hashTestConfig } from '../../domain/config-hash';
import { CreateTestRunOutcome, HttpMethod, TestRunStatus, TestType } from '../../domain/constants';
import { TestRunErrorCodes } from '../../domain/errors';
import type { TestJob, WorkerOrchestrator } from '../../domain/ports';
import type { TestRunsRepository } from '../../domain/repositories';
import type { TestConfigInput } from '../../domain/schemas';
import { TestRun } from '../../domain/test-run';
import { StartTestRunUseCase } from './start-test-run.use-case';

const OWNER_ID = '5d7e9a10-3c4b-4e2f-8a1d-6b9c0e2f4a13';
const MAX_CONCURRENT_TESTS = 2;

const input: TestConfigInput = {
    type: TestType.SINGLE,
    config: {
        target: { method: HttpMethod.GET, url: 'https://api.example.com/users' },
        targetRps: 10,
        durationSeconds: 10,
    },
};

const storedRun = (status: TestRunStatus): TestRun =>
    TestRun.restore({
        id: crypto.randomUUID(),
        userId: OWNER_ID,
        type: input.type,
        status,
        config: input.config,
        configHash: hashTestConfig(input),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

class FakeTestRunsRepository implements TestRunsRepository {
    created: TestRun[] = [];
    activeCount = 0;
    createOutcome: CreateTestRunOutcome = CreateTestRunOutcome.CREATED;

    constructor(private readonly stored: TestRun[] = []) {}

    async create(run: TestRun): Promise<CreateTestRunOutcome> {
        if (this.createOutcome === CreateTestRunOutcome.CREATED) {
            this.created.push(run);
        }
        return this.createOutcome;
    }

    async existsActiveWithConfigHash(userId: string, configHash: string): Promise<boolean> {
        return this.stored.some(
            (run) =>
                run.userId === userId &&
                run.configHash === configHash &&
                (run.status === TestRunStatus.PENDING || run.status === TestRunStatus.RUNNING),
        );
    }

    async findById(): Promise<TestRun | undefined> {
        return undefined;
    }

    async findByIdForUser(): Promise<TestRun | undefined> {
        return undefined;
    }

    async updateIfStatus(): Promise<boolean> {
        return true;
    }

    async countActive(): Promise<number> {
        return this.activeCount;
    }

    async findActive(): Promise<TestRun[]> {
        return [];
    }

    async findPage(): Promise<TestRun[]> {
        return [];
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

const isDuplicateActive = (error: unknown) =>
    isBaseExceptionWithCode(error, TestRunErrorCodes.DUPLICATE_ACTIVE);

describe('StartTestRunUseCase', () => {
    let orchestrator: FakeWorkerOrchestrator;

    const useCaseWith = (repository: TestRunsRepository) =>
        new StartTestRunUseCase(repository, orchestrator, configService);

    beforeEach(() => {
        orchestrator = new FakeWorkerOrchestrator();
    });

    it('rejects an active duplicate before the capacity check and creates nothing', async () => {
        const repository = new FakeTestRunsRepository([storedRun(TestRunStatus.RUNNING)]);
        repository.activeCount = MAX_CONCURRENT_TESTS;

        await expect(useCaseWith(repository).execute(input, OWNER_ID)).rejects.toSatisfy(
            isDuplicateActive,
        );

        expect(repository.created).toEqual([]);
        expect(orchestrator.jobs).toEqual([]);
    });

    it('rejects a run whose insert violates the active config uniqueness and enqueues nothing', async () => {
        const repository = new FakeTestRunsRepository();
        repository.createOutcome = CreateTestRunOutcome.DUPLICATE_ACTIVE;

        await expect(useCaseWith(repository).execute(input, OWNER_ID)).rejects.toSatisfy(
            isDuplicateActive,
        );

        expect(orchestrator.jobs).toEqual([]);
    });

    it('allows the same config after the previous run finished', async () => {
        const repository = new FakeTestRunsRepository([storedRun(TestRunStatus.COMPLETED)]);

        const response = await useCaseWith(repository).execute(input, OWNER_ID);

        expect(response.status).toBe(TestRunStatus.PENDING);
        expect(repository.created.map((run) => run.configHash)).toEqual([hashTestConfig(input)]);
        expect(orchestrator.jobs).toEqual([{ testId: response.id, ...input }]);
    });
});
