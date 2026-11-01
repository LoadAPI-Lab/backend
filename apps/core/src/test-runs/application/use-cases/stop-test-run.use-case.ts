import { HttpStatus, Injectable } from '@nestjs/common';
import { BaseException } from '@shared/error';

import { TestRunErrorCodes, TestRunErrorMessages } from '../../domain/errors';
import { TestRunStopper } from '../../domain/ports';
import { TestRunsRepository } from '../../domain/repositories';
import type { StopTestRunResponse } from '../dtos';

@Injectable()
export class StopTestRunUseCase {
    constructor(
        private readonly repository: TestRunsRepository,
        private readonly stopper: TestRunStopper,
    ) {}

    async execute(id: string): Promise<StopTestRunResponse> {
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

        if (run.isFinal()) {
            throw new BaseException(
                {
                    code: TestRunErrorCodes.ALREADY_FINISHED,
                    message: TestRunErrorMessages[TestRunErrorCodes.ALREADY_FINISHED],
                },
                HttpStatus.CONFLICT,
            );
        }

        await this.stopper.requestStop(id);

        return { id: run.id, status: run.status };
    }
}
