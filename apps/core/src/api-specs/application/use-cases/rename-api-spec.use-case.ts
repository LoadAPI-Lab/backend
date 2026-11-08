import { Injectable } from '@nestjs/common';

import { ApiSpecErrorCodes, apiSpecException } from '../../domain/errors';
import { ApiSpecsRepository } from '../../domain/repositories';
import type { ApiSpecSummaryResponse } from '../dtos';
import { toApiSpecSummaryResponse } from '../mappers';

@Injectable()
export class RenameApiSpecUseCase {
    constructor(private readonly repository: ApiSpecsRepository) {}

    async execute(id: string, name: string, userId: string): Promise<ApiSpecSummaryResponse> {
        const summary = await this.repository.updateName({
            id,
            userId,
            name,
            updatedAt: new Date(),
        });

        if (!summary) {
            throw apiSpecException(ApiSpecErrorCodes.NOT_FOUND);
        }

        return toApiSpecSummaryResponse(summary);
    }
}
