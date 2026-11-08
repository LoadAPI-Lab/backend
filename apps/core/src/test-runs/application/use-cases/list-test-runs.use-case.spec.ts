import { CreateTestRunOutcome, HttpMethod, TestRunStatus, TestType } from '../../domain/constants';
import type { TestRunPageQuery, TestRunsRepository } from '../../domain/repositories';
import { TestRun } from '../../domain/test-run';
import { ListTestRunsUseCase } from './list-test-runs.use-case';

const OWNER_ID = '5d7e9a10-3c4b-4e2f-8a1d-6b9c0e2f4a13';
const OTHER_USER_ID = 'e1a2b3c4-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const OWNER_FIRST_RUN_ID = 'b3f1c2d4-7a1e-4f0b-9c3a-2e8d5f6a7b90';
const OWNER_SECOND_RUN_ID = '8c2a1f00-7a1e-4f0b-9c3a-2e8d5f6a7b90';
const OTHER_USER_RUN_ID = '0f9e8d7c-6b5a-4f3e-9d2c-1b0a9f8e7d6c';
const PAGE_LIMIT = 10;
const PAGE_START = 0;
const NEXT_PAGE_PROBE_ROWS = 1;

const runOf = (id: string, userId: string, createdAt: string): TestRun =>
    TestRun.restore({
        id,
        userId,
        type: TestType.SINGLE,
        status: TestRunStatus.COMPLETED,
        config: {
            target: { method: HttpMethod.GET, url: 'https://api.example.com/users' },
            targetRps: 10,
            durationSeconds: 10,
        },
        createdAt: new Date(createdAt),
    });

class InMemoryTestRunsRepository implements TestRunsRepository {
    constructor(private readonly runs: TestRun[]) {}

    async create(): Promise<CreateTestRunOutcome> {
        return CreateTestRunOutcome.CREATED;
    }

    async existsActiveWithConfigHash(): Promise<boolean> {
        return false;
    }

    async findById(): Promise<TestRun | undefined> {
        return undefined;
    }

    async findByIdForUser(): Promise<TestRun | undefined> {
        return undefined;
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

    async findPage({ userId, limit }: TestRunPageQuery): Promise<TestRun[]> {
        const ownRuns = this.runs.filter((run) => run.userId === userId);
        ownRuns.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
        return ownRuns.slice(PAGE_START, limit + NEXT_PAGE_PROBE_ROWS);
    }
}

describe('ListTestRunsUseCase', () => {
    it("returns only the caller's runs", async () => {
        const useCase = new ListTestRunsUseCase(
            new InMemoryTestRunsRepository([
                runOf(OWNER_FIRST_RUN_ID, OWNER_ID, '2026-01-01T00:00:00.000Z'),
                runOf(OTHER_USER_RUN_ID, OTHER_USER_ID, '2026-01-02T00:00:00.000Z'),
                runOf(OWNER_SECOND_RUN_ID, OWNER_ID, '2026-01-03T00:00:00.000Z'),
            ]),
        );

        const response = await useCase.execute({ limit: PAGE_LIMIT }, OWNER_ID);

        expect(response.items.map((item) => item.id)).toEqual([
            OWNER_SECOND_RUN_ID,
            OWNER_FIRST_RUN_ID,
        ]);
        expect(response.nextCursor).toBeUndefined();
    });
});
