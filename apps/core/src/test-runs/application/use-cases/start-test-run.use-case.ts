import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseException } from '@shared/error';

import { TestRunStatus } from '../../domain/constants';
import { TestRunErrorCodes, TestRunErrorMessages } from '../../domain/errors';
import { WorkerOrchestrator } from '../../domain/ports';
import { TestRunsRepository } from '../../domain/repositories';
import type { TestConfigInput } from '../../domain/schemas';
import { TestRun } from '../../domain/test-run';
import type { StartTestRunResponse } from '../dtos';

const ENQUEUE_FAILED_REASON = 'failed to enqueue the job';

@Injectable()
export class StartTestRunUseCase {
    private readonly maxConcurrentTests: number;

    constructor(
        private readonly repository: TestRunsRepository,
        private readonly orchestrator: WorkerOrchestrator,
        configService: ConfigService,
    ) {
        this.maxConcurrentTests = configService.getOrThrow('MAX_CONCURRENT_TESTS');
    }

    async execute(input: TestConfigInput): Promise<StartTestRunResponse> {
        const activeRuns = await this.repository.countActive();
        if (activeRuns >= this.maxConcurrentTests) {
            throw new BaseException(
                {
                    code: TestRunErrorCodes.CAPACITY_EXCEEDED,
                    message: TestRunErrorMessages[TestRunErrorCodes.CAPACITY_EXCEEDED],
                },
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }

        const run = TestRun.create(input);
        await this.repository.create(run);

        try {
            await this.orchestrator.enqueue({ testId: run.id, ...input });
        } catch (error) {
            run.finish({
                status: TestRunStatus.FAILED,
                reason: ENQUEUE_FAILED_REASON,
                finishedAt: new Date(),
            });
            await this.repository.updateIfStatus(run, TestRunStatus.PENDING);

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
