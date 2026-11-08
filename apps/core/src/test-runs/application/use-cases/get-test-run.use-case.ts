import { Injectable } from '@nestjs/common';

import { TestRunErrorCodes, testRunException } from '../../domain/errors';
import { TestRunsRepository } from '../../domain/repositories';
import type { TestRunResponse } from '../dtos';
import { toTestRunResponse } from '../mappers';

@Injectable()
export class GetTestRunUseCase {
    constructor(private readonly repository: TestRunsRepository) {}

    async execute(id: string, userId: string): Promise<TestRunResponse> {
        const run = await this.repository.findByIdForUser(id, userId);

        if (!run) {
            throw testRunException(TestRunErrorCodes.NOT_FOUND);
        }

        return toTestRunResponse(run);
    }
}
