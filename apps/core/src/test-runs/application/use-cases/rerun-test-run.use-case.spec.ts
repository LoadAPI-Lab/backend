import type { ConfigService } from '@nestjs/config';
import { isBaseExceptionWithCode } from '@shared/error';

import { CreateTestRunOutcome, HttpMethod, TestRunStatus, TestType } from '../../domain/constants';
import { TestRunErrorCodes } from '../../domain/errors';
import type { TestJob, WorkerOrchestrator } from '../../domain/ports';
import type { TestRunsRepository } from '../../domain/repositories';
import type { SingleConfig } from '../../domain/schemas';
import { TestRun } from '../../domain/test-run';
import { RerunTestRunUseCase } from './rerun-test-run.use-case';
import { StartTestRunUseCase } from './start-test-run.use-case';

const TEST_ID = 'b3f1c2d4-7a1e-4f0b-9c3a-2e8d5f6a7b90';
const OWNER_ID = '5d7e9a10-3c4b-4e2f-8a1d-6b9c0e2f4a13';
const OTHER_USER_ID = 'e1a2b3c4-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const MAX_CONCURRENT_TESTS = 10;

const storedConfig: SingleConfig = {
    target: {
        method: HttpMethod.POST,
        url: 'https://api.example.com/users?api_key=query-secret-value',
        headers: { Authorization: 'Bearer header-secret-value' },
        body: '{"name":"{{$randomName}}"}',
    },
    targetRps: 10,
    durationSeconds: 10,
};

const storedRun = (): TestRun =>
    TestRun.restore({
        id: TEST_ID,
        userId: OWNER_ID,
        type: TestType.SINGLE,
        status: TestRunStatus.COMPLETED,
        config: storedConfig,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        result: {},
    });

class FakeTestRunsRepository implements TestRunsRepository {
    created: TestRun[] = [];

    constructor(private readonly stored: TestRun) {}

    async create(run: TestRun): Promise<CreateTestRunOutcome> {
        this.created.push(run);
        return CreateTestRunOutcome.CREATED;
    }

    async existsActiveWithConfigHash(): Promise<boolean> {
        return false;
    }

    async findById(id: string): Promise<TestRun | undefined> {
        return [this.stored].find((run) => run.id === id);
    }

    async findByIdForUser(id: string, userId: string): Promise<TestRun | undefined> {
        return [this.stored].find((run) => run.id === id && run.userId === userId);
    }

    async updateIfStatus(): Promise<boolean> {
        return true;
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

class FakeWorkerOrchestrator implements WorkerOrchestrator {
    jobs: TestJob[] = [];

    async enqueue(job: TestJob): Promise<void> {
        this.jobs.push(job);
    }
}

const configService = {
    getOrThrow: () => MAX_CONCURRENT_TESTS,
} as unknown as ConfigService;

const isNotFound = (error: unknown) => isBaseExceptionWithCode(error, TestRunErrorCodes.NOT_FOUND);

describe('RerunTestRunUseCase', () => {
    let repository: FakeTestRunsRepository;
    let orchestrator: FakeWorkerOrchestrator;
    let useCase: RerunTestRunUseCase;

    beforeEach(() => {
        repository = new FakeTestRunsRepository(storedRun());
        orchestrator = new FakeWorkerOrchestrator();
        useCase = new RerunTestRunUseCase(
            repository,
            new StartTestRunUseCase(repository, orchestrator, configService),
        );
    });

    it("rejects another user's run as not found and enqueues nothing", async () => {
        await expect(useCase.execute(TEST_ID, OTHER_USER_ID)).rejects.toSatisfy(isNotFound);

        expect(orchestrator.jobs).toEqual([]);
        expect(repository.created).toEqual([]);
    });

    it('enqueues the original unmasked config under a new test id', async () => {
        const response = await useCase.execute(TEST_ID, OWNER_ID);

        expect(response.id).not.toBe(TEST_ID);
        expect(response.status).toBe(TestRunStatus.PENDING);
        expect(orchestrator.jobs).toEqual([
            { testId: response.id, type: TestType.SINGLE, config: storedConfig },
        ]);
        expect(repository.created.map((run) => run.userId)).toEqual([OWNER_ID]);
    });
});
