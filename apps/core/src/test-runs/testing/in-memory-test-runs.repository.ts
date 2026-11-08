import { ACTIVE_STATUSES, CreateTestRunOutcome, type TestRunStatus } from '../domain/constants';
import type {
    TestRunPageCursor,
    TestRunPageQuery,
    TestRunsRepository,
} from '../domain/repositories';
import { TestRun } from '../domain/test-run';

const NEXT_PAGE_PROBE_ROWS = 1;
const PAGE_START = 0;
const BEFORE = -1;
const AFTER = 1;
const SAME = 0;

const isActive = (status: TestRunStatus): boolean =>
    (ACTIVE_STATUSES as readonly TestRunStatus[]).includes(status);

const copyOf = (run: TestRun): TestRun =>
    TestRun.restore({
        id: run.id,
        userId: run.userId,
        type: run.type,
        status: run.status,
        config: run.config,
        createdAt: run.createdAt,
        configHash: run.configHash,
        reason: run.reason,
        result: run.result,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
    });

const compareIds = (left: string, right: string): number => {
    if (left < right) {
        return BEFORE;
    }
    if (left > right) {
        return AFTER;
    }
    return SAME;
};

const newestFirst = (left: TestRun, right: TestRun): number =>
    right.createdAt.getTime() - left.createdAt.getTime() || compareIds(right.id, left.id);

const isOlderThanCursor = (run: TestRun, cursor: TestRunPageCursor): boolean => {
    const runTime = run.createdAt.getTime();
    const cursorTime = new Date(cursor.createdAt).getTime();
    return runTime < cursorTime || (runTime === cursorTime && run.id < cursor.id);
};

export class InMemoryTestRunsRepository implements TestRunsRepository {
    rejectUpdates = false;
    rejectCreatesAsDuplicate = false;

    private readonly runs = new Map<string, TestRun>();

    seed(...runs: TestRun[]): this {
        for (const run of runs) {
            this.runs.set(run.id, copyOf(run));
        }
        return this;
    }

    async create(run: TestRun): Promise<CreateTestRunOutcome> {
        if (this.rejectCreatesAsDuplicate || this.violatesActiveConfigHash(run)) {
            return CreateTestRunOutcome.DUPLICATE_ACTIVE;
        }

        this.runs.set(run.id, copyOf(run));
        return CreateTestRunOutcome.CREATED;
    }

    async existsActiveWithConfigHash(userId: string, configHash: string): Promise<boolean> {
        return this.hasActiveWithConfigHash(userId, configHash);
    }

    async findById(id: string): Promise<TestRun | null> {
        const run = this.runs.get(id);
        if (!run) {
            return null;
        }
        return copyOf(run);
    }

    async findByIdForUser(id: string, userId: string): Promise<TestRun | null> {
        const run = await this.findById(id);
        if (run?.userId !== userId) {
            return null;
        }
        return run;
    }

    async updateIfStatus(run: TestRun, expected: TestRunStatus): Promise<boolean> {
        const stored = this.runs.get(run.id);
        if (this.rejectUpdates || stored?.status !== expected) {
            return false;
        }

        this.runs.set(run.id, copyOf(run));
        return true;
    }

    async countActive(): Promise<number> {
        return this.activeRuns().length;
    }

    async findActive(): Promise<TestRun[]> {
        return this.activeRuns().map(copyOf);
    }

    async findPage({ userId, limit, cursor, status, type }: TestRunPageQuery): Promise<TestRun[]> {
        return [...this.runs.values()]
            .filter(
                (run) =>
                    run.userId === userId &&
                    (!cursor || isOlderThanCursor(run, cursor)) &&
                    (!status || run.status === status) &&
                    (!type || run.type === type),
            )
            .sort(newestFirst)
            .slice(PAGE_START, limit + NEXT_PAGE_PROBE_ROWS)
            .map(copyOf);
    }

    private activeRuns(): TestRun[] {
        return [...this.runs.values()].filter((run) => isActive(run.status));
    }

    private hasActiveWithConfigHash(userId: string, configHash: string): boolean {
        return this.activeRuns().some(
            (run) => run.userId === userId && run.configHash === configHash,
        );
    }

    private violatesActiveConfigHash(run: TestRun): boolean {
        return (
            run.configHash !== undefined &&
            isActive(run.status) &&
            this.hasActiveWithConfigHash(run.userId, run.configHash)
        );
    }
}
