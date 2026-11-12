import { Injectable } from '@nestjs/common';

import { ScenarioErrorCodes, scenarioException } from '../../domain/errors';
import { ScenariosRepository } from '../../domain/repositories';
import type { ScenarioResponse } from '../dtos';
import { toScenarioResponse } from '../mappers';

@Injectable()
export class GetScenarioUseCase {
    constructor(private readonly repository: ScenariosRepository) {}

    async execute(id: string, userId: string): Promise<ScenarioResponse> {
        const scenario = await this.repository.findByIdForUser(id, userId);

        if (!scenario) {
            throw scenarioException(ScenarioErrorCodes.NOT_FOUND);
        }

        return toScenarioResponse(scenario);
    }
}
