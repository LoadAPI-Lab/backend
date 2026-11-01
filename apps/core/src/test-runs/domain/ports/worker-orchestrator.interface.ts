import type { TestConfigInput } from '../schemas';

export type TestJob = { testId: string } & TestConfigInput;

export abstract class WorkerOrchestrator {
    abstract enqueue(job: TestJob): Promise<void>;
}
