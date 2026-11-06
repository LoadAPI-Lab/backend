import { Injectable } from '@nestjs/common';

import { ApiSpecsRepository } from '../../domain/repositories';
import type { ApiSpecSummaryResponse } from '../dtos';
import { toApiSpecSummaryResponse } from '../mappers';

@Injectable()
export class ListApiSpecsUseCase {
    constructor(private readonly repository: ApiSpecsRepository) {}

    async execute(userId: string): Promise<ApiSpecSummaryResponse[]> {
        const summaries = await this.repository.listForUser(userId);

        return summaries.map(toApiSpecSummaryResponse);
    }
}
