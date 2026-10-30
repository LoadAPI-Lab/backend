import type { TestRunStatus } from '../constants';
import type { TestRun } from '../test-run';

export abstract class TestRunsRepository {
    abstract create(run: TestRun): Promise<void>;
    abstract findById(id: string): Promise<TestRun | undefined>;
    abstract updateIfStatus(run: TestRun, expected: TestRunStatus): Promise<boolean>;
}
