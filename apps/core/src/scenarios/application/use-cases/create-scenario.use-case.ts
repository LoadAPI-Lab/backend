import { Injectable, Logger } from '@nestjs/common';

import { ScenariosRepository } from '../../domain/repositories';
import { Scenario } from '../../domain/scenario';
import type { ScenarioBody, ScenarioResponse } from '../dtos';
import { toScenarioResponse } from '../mappers';

@Injectable()
export class CreateScenarioUseCase {
    private readonly logger = new Logger(CreateScenarioUseCase.name);

    constructor(private readonly repository: ScenariosRepository) {}

    async execute(command: ScenarioBody, userId: string): Promise<ScenarioResponse> {
        const scenario = Scenario.create({ userId, name: command.name, config: command.config });

        await this.repository.create(scenario);

        this.logger.log({
            message: 'Scenario created',
            userId,
            scenarioId: scenario.id,
            stepsCount: scenario.stepsCount,
        });

        return toScenarioResponse(scenario);
    }
}
