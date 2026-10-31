import { HttpStatus, Injectable } from '@nestjs/common';
import { BaseException } from '@shared/error';

import { TestRunErrorCodes, TestRunErrorMessages } from '../../domain/errors';
import { WorkerOrchestrator } from '../../domain/ports';
import { TestRunsRepository } from '../../domain/repositories';
import type { TestConfigInput } from '../../domain/schemas';
import { TestRun } from '../../domain/test-run';
import type { StartTestRunResponse } from '../dtos';

const ENQUEUE_FAILED_REASON = 'failed to enqueue the job';

@Injectable()
export class StartTestRunUseCase {
    constructor(
        private readonly repository: TestRunsRepository,
        private readonly orchestrator: WorkerOrchestrator,
    ) {}

    async execute(input: TestConfigInput): Promise<StartTestRunResponse> {
        const run = TestRun.create(input);
        await this.repository.create(run);

        try {
            await this.orchestrator.enqueue({ testId: run.id, ...input });
        } catch (error) {
            run.finish({
                status: 'FAILED',
                reason: ENQUEUE_FAILED_REASON,
                finishedAt: new Date(),
            });
            await this.repository.updateIfStatus(run, 'PENDING');

            throw new BaseException(
                {
                    code: TestRunErrorCodes.ENQUEUE_FAILED,
                    message: TestRunErrorMessages[TestRunErrorCodes.ENQUEUE_FAILED],
                },
                HttpStatus.SERVICE_UNAVAILABLE,
                error,
            );
        }

        return { id: run.id, status: run.status };
    }
}
