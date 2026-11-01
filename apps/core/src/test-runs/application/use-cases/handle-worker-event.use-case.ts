import { Injectable } from '@nestjs/common';

import { TestRunStatus, WorkerEventType } from '../../domain/constants';
import { TestRunsRepository } from '../../domain/repositories';
import type { TestRun } from '../../domain/test-run';
import type { FinishedEvent, WorkerEvent } from '../dtos';

export const WorkerEventOutcome = {
    APPLIED: 'applied',
    IGNORED: 'ignored',
    UNKNOWN_TEST_RUN: 'unknown_test_run',
} as const;
export type WorkerEventOutcome = (typeof WorkerEventOutcome)[keyof typeof WorkerEventOutcome];

@Injectable()
export class HandleWorkerEventUseCase {
    constructor(private readonly repository: TestRunsRepository) {}

    async execute(event: WorkerEvent): Promise<WorkerEventOutcome> {
        const run = await this.repository.findById(event.testId);
        if (!run) {
            return WorkerEventOutcome.UNKNOWN_TEST_RUN;
        }

        const previousStatus = run.status;
        const transitioned =
            event.eventType === WorkerEventType.STARTED
                ? run.markStarted(event.timestamp)
                : this.finish(run, event);
        if (!transitioned) {
            return WorkerEventOutcome.IGNORED;
        }

        const updated = await this.repository.updateIfStatus(run, previousStatus);
        return updated ? WorkerEventOutcome.APPLIED : WorkerEventOutcome.IGNORED;
    }

    private finish(run: TestRun, event: FinishedEvent): boolean {
        const { startedAt, finishedAt } = event;

        if (event.status === TestRunStatus.FAILED) {
            return run.finish({
                status: TestRunStatus.FAILED,
                reason: event.reason,
                startedAt,
                finishedAt,
            });
        }

        return run.finish({ status: event.status, result: event.result, startedAt, finishedAt });
    }
}
