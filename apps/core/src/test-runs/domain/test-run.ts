import { FINAL_STATUSES, type TestRunStatus, type TestType } from './constants';
import type { ScenarioConfig, SingleConfig } from './schemas';

export type TestRunConfig = SingleConfig | ScenarioConfig;

interface TestRunState {
    readonly id: string;
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
    | { status: 'COMPLETED' | 'STOPPED'; result: unknown; finishedAt: Date; startedAt?: Date }
    | { status: 'FAILED'; reason: string; finishedAt: Date; startedAt?: Date };

const isFinalStatus = (status: TestRunStatus): boolean =>
    (FINAL_STATUSES as readonly string[]).includes(status);

export class TestRun {
    private constructor(private readonly state: TestRunState) {}

    static create(input: { type: TestType; config: TestRunConfig; now?: Date }): TestRun {
        return new TestRun({
            id: crypto.randomUUID(),
            type: input.type,
            config: input.config,
            createdAt: input.now ?? new Date(),
            status: 'PENDING',
        });
    }

    static restore(props: {
        id: string;
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
        if (this.state.status !== 'PENDING') {
            return false;
        }

        this.state.status = 'RUNNING';
        this.state.startedAt = at;
        return true;
    }

    finish(input: FinishInput): boolean {
        if (isFinalStatus(this.state.status)) {
            return false;
        }

        if (input.status === 'FAILED' && input.reason.trim() === '') {
            throw new Error('A FAILED test run requires a non-empty reason');
        }

        this.state.status = input.status;
        this.state.finishedAt = input.finishedAt;
        this.state.startedAt ??= input.startedAt;

        if (input.status === 'FAILED') {
            this.state.reason = input.reason;
        } else {
            this.state.result = input.result;
        }

        return true;
    }

    isStuck(now: Date, maxRunningMs: number): boolean {
        if (this.state.status !== 'RUNNING' || this.state.startedAt === undefined) {
            return false;
        }

        return now.getTime() - this.state.startedAt.getTime() > maxRunningMs;
    }

    isPendingTooLong(now: Date, maxPendingMs: number): boolean {
        if (this.state.status !== 'PENDING') {
            return false;
        }

        return now.getTime() - this.state.createdAt.getTime() > maxPendingMs;
    }
}
