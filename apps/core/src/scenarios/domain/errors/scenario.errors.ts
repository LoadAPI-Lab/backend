import { HttpStatus } from '@nestjs/common';
import { createErrorFactory } from '@shared/error';

export const ScenarioErrorCodes = {
    NOT_FOUND: 'SCENARIO.NOT_FOUND',
} as const;

export type ScenarioErrorCode = (typeof ScenarioErrorCodes)[keyof typeof ScenarioErrorCodes];

export const ScenarioErrorMessages: Record<ScenarioErrorCode, string> = {
    [ScenarioErrorCodes.NOT_FOUND]: 'Scenario not found',
};

export const ScenarioErrorStatuses: Record<ScenarioErrorCode, HttpStatus> = {
    [ScenarioErrorCodes.NOT_FOUND]: HttpStatus.NOT_FOUND,
};

export const scenarioException = createErrorFactory(ScenarioErrorMessages, ScenarioErrorStatuses);
