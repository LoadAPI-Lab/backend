import type { ReplaceScenarioInput } from '../../../domain/repositories';
import { Scenario } from '../../../domain/scenario';
import type { scenarios } from '../models';

type ScenarioRow = typeof scenarios.$inferSelect;
type ScenarioInsert = typeof scenarios.$inferInsert;
type ScenarioReplaceUpdate = Pick<ScenarioInsert, 'name' | 'config' | 'stepsCount' | 'updatedAt'>;

export function toDomainScenario(row: ScenarioRow): Scenario {
    return Scenario.restore({
        id: row.id,
        userId: row.userId,
        name: row.name,
        config: row.config,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    });
}

export function toScenarioRow(scenario: Scenario): ScenarioInsert {
    return {
        id: scenario.id,
        userId: scenario.userId,
        name: scenario.name,
        config: scenario.config,
        stepsCount: scenario.stepsCount,
        createdAt: scenario.createdAt,
        updatedAt: scenario.updatedAt,
    };
}

export function toScenarioReplaceRow(input: ReplaceScenarioInput): ScenarioReplaceUpdate {
    return {
        name: input.name,
        config: input.config,
        stepsCount: input.config.steps.length,
        updatedAt: input.updatedAt,
    };
}
