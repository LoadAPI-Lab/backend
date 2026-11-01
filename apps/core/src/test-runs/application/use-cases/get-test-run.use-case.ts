import { HttpStatus, Injectable } from '@nestjs/common';
import { BaseException } from '@shared/error';

import { TestRunErrorCodes, TestRunErrorMessages } from '../../domain/errors';
import { TestRunsRepository } from '../../domain/repositories';
import type { TestRun } from '../../domain/test-run';
import type { TestRunResponse } from '../dtos';

const toTestRunResponse = (run: TestRun): TestRunResponse => ({
    id: run.id,
    type: run.type,
    status: run.status,
    createdAt: run.createdAt.toISOString(),
    ...(run.startedAt !== undefined && { startedAt: run.startedAt.toISOString() }),
    ...(run.finishedAt !== undefined && { finishedAt: run.finishedAt.toISOString() }),
    ...(run.reason !== undefined && { reason: run.reason }),
    ...(run.result !== undefined && { result: run.result }),
});

@Injectable()
export class GetTestRunUseCase {
    constructor(private readonly repository: TestRunsRepository) {}

    async execute(id: string): Promise<TestRunResponse> {
        const run = await this.repository.findById(id);

        if (!run) {
            throw new BaseException(
                {
                    code: TestRunErrorCodes.NOT_FOUND,
                    message: TestRunErrorMessages[TestRunErrorCodes.NOT_FOUND],
                },
                HttpStatus.NOT_FOUND,
            );
        }

        return toTestRunResponse(run);
    }
}
