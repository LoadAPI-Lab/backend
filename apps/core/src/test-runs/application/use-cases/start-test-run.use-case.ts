import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { hashTestConfig } from '../../domain/config-hash';
import { CreateTestRunOutcome, TestRunStatus } from '../../domain/constants';
import { TestRunErrorCodes, testRunException } from '../../domain/errors';
import { WorkerOrchestrator } from '../../domain/ports';
import { TestRunsRepository } from '../../domain/repositories';
import type { TestConfigInput } from '../../domain/schemas';
import { TestRun } from '../../domain/test-run';
import type { StartTestRunResponse } from '../dtos';

const ENQUEUE_FAILED_REASON = 'failed to enqueue the job';
const MISSING_CONFLICTING_RUN_MESSAGE =
    'The idempotency key conflicted on insert but no run with this key was found';

@Injectable()
export class StartTestRunUseCase {
    private readonly logger = new Logger(StartTestRunUseCase.name);
    private readonly maxConcurrentTests: number;

    constructor(
        private readonly repository: TestRunsRepository,
        private readonly orchestrator: WorkerOrchestrator,
        configService: ConfigService,
    ) {
        this.maxConcurrentTests = configService.getOrThrow('MAX_CONCURRENT_TESTS');
    }

    async execute(
        input: TestConfigInput,
        userId: string,
        idempotencyKey?: string,
    ): Promise<StartTestRunResponse> {
        const configHash = hashTestConfig(input);

        if (idempotencyKey !== undefined) {
            const existing = await this.repository.findByIdempotencyKey(userId, idempotencyKey);
            if (existing) {
                return this.replay(existing, configHash, idempotencyKey);
            }
        }

        const activeRuns = await this.repository.countActive();
        if (activeRuns >= this.maxConcurrentTests) {
            throw testRunException(TestRunErrorCodes.CAPACITY_EXCEEDED);
        }

        const run = TestRun.create({ ...input, userId, configHash, idempotencyKey });
        const outcome = await this.repository.create(run);
        if (outcome === CreateTestRunOutcome.IDEMPOTENCY_KEY_CONFLICT) {
            return this.replayConflicting(userId, configHash, idempotencyKey);
        }

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

    private async replayConflicting(
        userId: string,
        configHash: string,
        idempotencyKey: string | undefined,
    ): Promise<StartTestRunResponse> {
        if (idempotencyKey === undefined) {
            throw new Error(MISSING_CONFLICTING_RUN_MESSAGE);
        }

        const existing = await this.repository.findByIdempotencyKey(userId, idempotencyKey);
        if (!existing) {
            throw new Error(MISSING_CONFLICTING_RUN_MESSAGE);
        }

        return this.replay(existing, configHash, idempotencyKey);
    }

    private replay(
        existing: TestRun,
        configHash: string,
        idempotencyKey: string,
    ): StartTestRunResponse {
        if (existing.configHash !== configHash) {
            throw testRunException(TestRunErrorCodes.IDEMPOTENCY_KEY_REUSED);
        }

        this.logger.debug(`Replayed test run ${existing.id} for idempotency key ${idempotencyKey}`);

        return { id: existing.id, status: existing.status };
    }
}
