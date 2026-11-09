import { Injectable } from '@nestjs/common';

import { TestRunErrorCodes, testRunException } from '../../domain/errors';
import { TestRunsRepository } from '../../domain/repositories';
import type { StartTestRunResponse } from '../dtos';
import { StartTestRunUseCase } from './start-test-run.use-case';

@Injectable()
export class RerunTestRunUseCase {
    constructor(
        private readonly repository: TestRunsRepository,
        private readonly startTestRun: StartTestRunUseCase,
    ) {}

    async execute(
        id: string,
        userId: string,
        idempotencyKey?: string,
    ): Promise<StartTestRunResponse> {
        const run = await this.repository.findByIdForUser(id, userId);

        if (!run) {
            throw testRunException(TestRunErrorCodes.NOT_FOUND);
        }

        return this.startTestRun.execute(run.configInput, userId, idempotencyKey);
    }
}
