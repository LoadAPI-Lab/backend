import type { Scenario, ScenarioSummary } from '../../domain/scenario';
import type { ScenarioResponse, ScenarioSummaryResponse } from '../dtos';

export const toScenarioSummaryResponse = (
    summary: ScenarioSummary | Scenario,
): ScenarioSummaryResponse => ({
    id: summary.id,
    name: summary.name,
    stepsCount: summary.stepsCount,
    createdAt: summary.createdAt.toISOString(),
    updatedAt: summary.updatedAt.toISOString(),
});

export const toScenarioResponse = (scenario: Scenario): ScenarioResponse => ({
    ...toScenarioSummaryResponse(scenario),
    config: scenario.config,
});
