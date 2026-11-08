import { isBaseExceptionWithCode } from '@shared/error';

import { CreateTestRunOutcome, HttpMethod, TestRunStatus, TestType } from '../../domain/constants';
import { TestRunErrorCodes } from '../../domain/errors';
import type { TestRunStopper } from '../../domain/ports';
import type { TestRunsRepository } from '../../domain/repositories';
import { TestRun } from '../../domain/test-run';
import { StopTestRunUseCase } from './stop-test-run.use-case';

const TEST_ID = 'b3f1c2d4-7a1e-4f0b-9c3a-2e8d5f6a7b90';
const OWNER_ID = '5d7e9a10-3c4b-4e2f-8a1d-6b9c0e2f4a13';
const OTHER_USER_ID = 'e1a2b3c4-5d6e-4f70-8a9b-0c1d2e3f4a5b';

const storedRun = (): TestRun =>
    TestRun.restore({
        id: TEST_ID,
        userId: OWNER_ID,
        type: TestType.SINGLE,
        status: TestRunStatus.RUNNING,
        config: {
            target: { method: HttpMethod.GET, url: 'https://api.example.com/users' },
            targetRps: 10,
            durationSeconds: 10,
        },
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        startedAt: new Date('2026-01-01T00:01:00.000Z'),
    });

class FakeTestRunsRepository implements TestRunsRepository {
    constructor(private readonly stored: TestRun) {}

    async create(): Promise<CreateTestRunOutcome> {
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

class FakeTestRunStopper implements TestRunStopper {
    stopped: string[] = [];

    async requestStop(testId: string): Promise<void> {
        this.stopped.push(testId);
    }
}

const isNotFound = (error: unknown) => isBaseExceptionWithCode(error, TestRunErrorCodes.NOT_FOUND);

describe('StopTestRunUseCase', () => {
    let stopper: FakeTestRunStopper;
    let useCase: StopTestRunUseCase;

    beforeEach(() => {
        stopper = new FakeTestRunStopper();
        useCase = new StopTestRunUseCase(new FakeTestRunsRepository(storedRun()), stopper);
    });

    it("requests a stop of the owner's run", async () => {
        await expect(useCase.execute(TEST_ID, OWNER_ID)).resolves.toEqual({
            id: TEST_ID,
            status: TestRunStatus.RUNNING,
        });

        expect(stopper.stopped).toEqual([TEST_ID]);
    });

    it("rejects another user's run as not found without stopping it", async () => {
        await expect(useCase.execute(TEST_ID, OTHER_USER_ID)).rejects.toSatisfy(isNotFound);

        expect(stopper.stopped).toEqual([]);
    });
});
