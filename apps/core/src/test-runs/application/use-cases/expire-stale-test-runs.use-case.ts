import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describeError } from '@shared/error';

import { TestRunFailureReason, TestRunStatus } from '../../domain/constants';
import { LiveFeed, TestRunStopper } from '../../domain/ports';
import { TestRunsRepository } from '../../domain/repositories';
import type { TestRun } from '../../domain/test-run';

@Injectable()
export class ExpireStaleTestRunsUseCase {
    private readonly logger = new Logger(ExpireStaleTestRunsUseCase.name);
    private readonly pendingTimeoutMs: number;
    private readonly requestTimeoutMs: number;
    private readonly runningGraceMs: number;

    constructor(
        private readonly repository: TestRunsRepository,
        private readonly stopper: TestRunStopper,
        private readonly liveFeed: LiveFeed,
        configService: ConfigService,
    ) {
        this.pendingTimeoutMs = configService.getOrThrow('PENDING_TIMEOUT_MS');
        this.requestTimeoutMs = configService.getOrThrow('WORKER_REQUEST_TIMEOUT_MS');
        this.runningGraceMs = configService.getOrThrow('RUNNING_GRACE_MS');
    }

    async execute(now: Date): Promise<number> {
        const runs = await this.repository.findActive();

        let expiredCount = 0;
        for (const run of runs) {
            try {
                if (await this.expire(run, now)) {
                    expiredCount += 1;
                }
            } catch (error) {
                this.logger.error(`Failed to expire test run ${run.id}: ${describeError(error)}`);
            }
        }

        return expiredCount;
    }

    private async expire(run: TestRun, now: Date): Promise<boolean> {
        const reason = this.failureReason(run, now);
        if (!reason) {
            return false;
        }

        await this.stopper.requestStop(run.id);

        const previousStatus = run.status;
        run.finish({ status: TestRunStatus.FAILED, reason, finishedAt: now });

        const updated = await this.repository.updateIfStatus(run, previousStatus);
        if (!updated) {
            return false;
        }

        this.liveFeed.publishStatus(run.id, run.status, run.reason);
        return true;
    }

    private failureReason(run: TestRun, now: Date): TestRunFailureReason | undefined {
        if (run.isPendingTooLong(now, this.pendingTimeoutMs)) {
            return TestRunFailureReason.NO_WORKER;
        }

        const maxRunningMs = run.maxRunningMs(this.requestTimeoutMs, this.runningGraceMs);
        if (run.isStuck(now, maxRunningMs)) {
            return TestRunFailureReason.RESULT_NOT_REPORTED;
        }

        return undefined;
    }
}
