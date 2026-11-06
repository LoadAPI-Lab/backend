import { FINAL_STATUSES, TestRunStatus, type TestType } from './constants';
import type { ScenarioConfig, SingleConfig, TestConfigInput } from './schemas';

export type TestRunConfig = SingleConfig | ScenarioConfig;

const MS_PER_SECOND = 1000;

interface TestRunState {
    readonly id: string;
    readonly userId: string;
    readonly type: TestType;
    readonly config: TestRunConfig;
    readonly createdAt: Date;
    status: TestRunStatus;
    reason?: string;
    result?: unknown;
    startedAt?: Date;
    finishedAt?: Date;
}

type FinishInput =
    | {
          status: typeof TestRunStatus.COMPLETED | typeof TestRunStatus.STOPPED;
          result: unknown;
          finishedAt: Date;
          startedAt?: Date;
      }
    | { status: typeof TestRunStatus.FAILED; reason: string; finishedAt: Date; startedAt?: Date };

export const isFinalStatus = (status: TestRunStatus): boolean =>
    (FINAL_STATUSES as readonly string[]).includes(status);

export class TestRun {
    private constructor(private readonly state: TestRunState) {}

    static create(input: TestConfigInput & { userId: string; now?: Date }): TestRun {
        return new TestRun({
            id: crypto.randomUUID(),
            userId: input.userId,
            type: input.type,
            config: input.config,
            createdAt: input.now ?? new Date(),
            status: TestRunStatus.PENDING,
        });
    }

    static restore(props: {
        id: string;
        userId: string;
        type: TestType;
        status: TestRunStatus;
        config: TestRunConfig;
        createdAt: Date;
        reason?: string;
        result?: unknown;
        startedAt?: Date;
        finishedAt?: Date;
    }): TestRun {
        return new TestRun({ ...props });
    }

    get id(): string {
        return this.state.id;
    }

    get userId(): string {
        return this.state.userId;
    }

    get type(): TestType {
        return this.state.type;
    }

    get status(): TestRunStatus {
        return this.state.status;
    }

    get config(): TestRunConfig {
        return this.state.config;
    }

    get reason(): string | undefined {
        return this.state.reason;
    }

    get result(): unknown {
        return this.state.result;
    }

    get createdAt(): Date {
        return this.state.createdAt;
    }

    get startedAt(): Date | undefined {
        return this.state.startedAt;
    }

    get finishedAt(): Date | undefined {
        return this.state.finishedAt;
    }

    markStarted(at: Date): boolean {
        if (this.state.status !== TestRunStatus.PENDING) {
            return false;
        }

        this.state.status = TestRunStatus.RUNNING;
        this.state.startedAt = at;
        return true;
    }

    finish(input: FinishInput): boolean {
        if (isFinalStatus(this.state.status)) {
            return false;
        }

        if (input.status === TestRunStatus.FAILED && input.reason.trim() === '') {
            throw new Error('A FAILED test run requires a non-empty reason');
        }

        this.state.status = input.status;
        this.state.finishedAt = input.finishedAt;
        this.state.startedAt ??= input.startedAt;

        if (input.status === TestRunStatus.FAILED) {
            this.state.reason = input.reason;
        } else {
            this.state.result = input.result;
        }

        return true;
    }

    isFinal(): boolean {
        return isFinalStatus(this.state.status);
    }

    isStuck(now: Date, maxRunningMs: number): boolean {
        if (this.state.status !== TestRunStatus.RUNNING || this.state.startedAt === undefined) {
            return false;
        }

        return now.getTime() - this.state.startedAt.getTime() > maxRunningMs;
    }

    isPendingTooLong(now: Date, maxPendingMs: number): boolean {
        if (this.state.status !== TestRunStatus.PENDING) {
            return false;
        }

        return now.getTime() - this.state.createdAt.getTime() > maxPendingMs;
    }

    maxRunningMs(requestTimeoutMs: number, graceMs: number): number {
        const { config } = this.state;

        if ('steps' in config) {
            return config.steps.length * requestTimeoutMs + graceMs;
        }

        return config.durationSeconds * MS_PER_SECOND + requestTimeoutMs + graceMs;
    }
}
