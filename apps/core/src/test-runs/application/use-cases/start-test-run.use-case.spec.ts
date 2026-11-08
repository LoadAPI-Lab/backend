import type { ConfigService } from '@nestjs/config';
import { isBaseExceptionWithCode } from '@shared/error';

import { hashTestConfig } from '../../domain/config-hash';
import { CreateTestRunOutcome, HttpMethod, TestRunStatus, TestType } from '../../domain/constants';
import { TestRunErrorCodes } from '../../domain/errors';
import type { TestJob, WorkerOrchestrator } from '../../domain/ports';
import type { TestConfigInput } from '../../domain/schemas';
import { TestRun } from '../../domain/test-run';
import { InMemoryTestRunsRepository } from '../../testing';
import { StartTestRunUseCase } from './start-test-run.use-case';

const OWNER_ID = '5d7e9a10-3c4b-4e2f-8a1d-6b9c0e2f4a13';
const OTHER_USER_ID = 'e1a2b3c4-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const MAX_CONCURRENT_TESTS = 2;

const input: TestConfigInput = {
    type: TestType.SINGLE,
    config: {
        target: { method: HttpMethod.GET, url: 'https://api.example.com/users' },
        targetRps: 10,
        durationSeconds: 10,
    },
};

const storedRun = (status: TestRunStatus, userId = OWNER_ID): TestRun =>
    TestRun.restore({
        id: crypto.randomUUID(),
        userId,
        type: input.type,
        status,
        config: input.config,
        configHash: hashTestConfig(input),
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

    const useCaseWith = (repository: InMemoryTestRunsRepository) =>
        new StartTestRunUseCase(repository, orchestrator, configService);

    beforeEach(() => {
        orchestrator = new FakeWorkerOrchestrator();
    });

    it('rejects an active duplicate before the capacity check and creates nothing', async () => {
        const repository = new RecordingTestRunsRepository().seed(
            storedRun(TestRunStatus.RUNNING),
            ...Array.from({ length: MAX_CONCURRENT_TESTS - 1 }, () =>
                storedRun(TestRunStatus.PENDING, OTHER_USER_ID),
            ),
        );

        await expect(useCaseWith(repository).execute(input, OWNER_ID)).rejects.toSatisfy(
            isDuplicateActive,
        );

        expect(repository.created).toEqual([]);
        expect(orchestrator.jobs).toEqual([]);
    });

    it('rejects a run whose insert violates the active config uniqueness and enqueues nothing', async () => {
        const repository = new RecordingTestRunsRepository();
        repository.rejectCreatesAsDuplicate = true;

        await expect(useCaseWith(repository).execute(input, OWNER_ID)).rejects.toSatisfy(
            isDuplicateActive,
        );

        expect(orchestrator.jobs).toEqual([]);
    });

    it('allows the same config after the previous run finished', async () => {
        const repository = new RecordingTestRunsRepository().seed(
            storedRun(TestRunStatus.COMPLETED),
        );

        const response = await useCaseWith(repository).execute(input, OWNER_ID);

        expect(response.status).toBe(TestRunStatus.PENDING);
        expect(repository.created.map((run) => run.configHash)).toEqual([hashTestConfig(input)]);
        expect(orchestrator.jobs).toEqual([{ testId: response.id, ...input }]);
    });
});
