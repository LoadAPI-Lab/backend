import { Injectable } from '@nestjs/common';

import { TestRunErrorCodes, testRunException } from '../../domain/errors';
import { TestRunStopper } from '../../domain/ports';
import { TestRunsRepository } from '../../domain/repositories';
import type { StopTestRunResponse } from '../dtos';

@Injectable()
export class StopTestRunUseCase {
    constructor(
        private readonly repository: TestRunsRepository,
        private readonly stopper: TestRunStopper,
    ) {}

    async execute(id: string, userId: string): Promise<StopTestRunResponse> {
        const run = await this.repository.findByIdForUser(id, userId);

        if (!run) {
            throw testRunException(TestRunErrorCodes.NOT_FOUND);
        }

        if (run.isFinal()) {
            throw testRunException(TestRunErrorCodes.ALREADY_FINISHED);
        }

        await this.stopper.requestStop(id);

        return { id: run.id, status: run.status };
    }
}
