import { Injectable } from '@nestjs/common';

import { ScenarioErrorCodes, scenarioException } from '../../domain/errors';
import { ScenariosRepository } from '../../domain/repositories';
import type { ScenarioBody, ScenarioResponse } from '../dtos';
import { toScenarioResponse } from '../mappers';

@Injectable()
export class ReplaceScenarioUseCase {
    constructor(private readonly repository: ScenariosRepository) {}

    async execute(id: string, command: ScenarioBody, userId: string): Promise<ScenarioResponse> {
        const scenario = await this.repository.replaceForUser({
            id,
            userId,
            name: command.name,
            config: command.config,
            updatedAt: new Date(),
        });

        if (!scenario) {
            throw scenarioException(ScenarioErrorCodes.NOT_FOUND);
        }

        return toScenarioResponse(scenario);
    }
}
