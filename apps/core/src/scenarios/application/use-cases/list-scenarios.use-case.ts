import { Injectable } from '@nestjs/common';

import { ScenariosRepository } from '../../domain/repositories';
import type { ScenarioSummaryResponse } from '../dtos';
import { toScenarioSummaryResponse } from '../mappers';

@Injectable()
export class ListScenariosUseCase {
    constructor(private readonly repository: ScenariosRepository) {}

    async execute(userId: string): Promise<ScenarioSummaryResponse[]> {
        const summaries = await this.repository.listForUser(userId);

        return summaries.map(toScenarioSummaryResponse);
    }
}
