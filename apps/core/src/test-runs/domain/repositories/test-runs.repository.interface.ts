import type { CreateTestRunOutcome, TestRunStatus, TestType } from '../constants';
import type { TestRun } from '../test-run';

export interface TestRunPageCursor {
    readonly createdAt: string;
    readonly id: string;
}

export interface TestRunPageQuery {
    readonly userId: string;
    readonly limit: number;
    readonly cursor?: TestRunPageCursor;
    readonly status?: TestRunStatus;
    readonly type?: TestType;
}

export abstract class TestRunsRepository {
    abstract create(run: TestRun): Promise<CreateTestRunOutcome>;
    abstract findByIdempotencyKey(userId: string, idempotencyKey: string): Promise<TestRun | null>;
    abstract findById(id: string): Promise<TestRun | null>;
    abstract findByIdForUser(id: string, userId: string): Promise<TestRun | null>;
    abstract updateIfStatus(run: TestRun, expected: TestRunStatus): Promise<boolean>;
    abstract countActive(): Promise<number>;
    abstract findActive(): Promise<TestRun[]>;
    abstract findPage(query: TestRunPageQuery): Promise<TestRun[]>;
}
