import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TestRunStatus } from '../../domain/constants';
import { TestRunErrorCodes, testRunException } from '../../domain/errors';
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

    async execute(input: TestConfigInput, userId: string): Promise<StartTestRunResponse> {
        const activeRuns = await this.repository.countActive();
        if (activeRuns >= this.maxConcurrentTests) {
            throw testRunException(TestRunErrorCodes.CAPACITY_EXCEEDED);
        }

        const run = TestRun.create({ ...input, userId });
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

            throw testRunException(TestRunErrorCodes.ENQUEUE_FAILED, { cause: error });
        }

        return { id: run.id, status: run.status };
    }
}
