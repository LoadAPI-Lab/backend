import { Injectable } from '@nestjs/common';

import { ScenarioErrorCodes, scenarioException } from '../../domain/errors';
import { ScenariosRepository } from '../../domain/repositories';

@Injectable()
export class DeleteScenarioUseCase {
    constructor(private readonly repository: ScenariosRepository) {}

    async execute(id: string, userId: string): Promise<void> {
        const deleted = await this.repository.deleteForUser(id, userId);

        if (!deleted) {
            throw scenarioException(ScenarioErrorCodes.NOT_FOUND);
        }
    }
}
