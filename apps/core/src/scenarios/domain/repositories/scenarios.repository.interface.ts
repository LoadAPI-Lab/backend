import type { ScenarioConfig } from '@shared/scenario';

import type { Scenario, ScenarioSummary } from '../scenario';

export interface ReplaceScenarioInput {
    readonly id: string;
    readonly userId: string;
    readonly name: string;
    readonly config: ScenarioConfig;
    readonly updatedAt: Date;
}

export abstract class ScenariosRepository {
    abstract create(scenario: Scenario): Promise<void>;
    abstract findByIdForUser(id: string, userId: string): Promise<Scenario | null>;
    abstract listForUser(userId: string): Promise<ScenarioSummary[]>;
    abstract replaceForUser(input: ReplaceScenarioInput): Promise<Scenario | null>;
    abstract deleteForUser(id: string, userId: string): Promise<boolean>;
}
