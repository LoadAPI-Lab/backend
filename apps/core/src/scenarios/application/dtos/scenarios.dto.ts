import { HTTP_METHODS } from '@shared/constants';
import { scenarioConfigSchema } from '@shared/scenario';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod/v4';

import { SCENARIO_NAME_MAX_LENGTH } from '../../domain/constants';

const TESTSERVER_URL = 'http://testserver:8080';

const scenarioBodyExample = {
    name: 'Login, create a task and read it back',
    config: {
        steps: [
            {
                target: {
                    method: 'POST',
                    url: `${TESTSERVER_URL}/auth/login`,
                    headers: { 'Content-Type': 'application/json' },
                    body: '{"email":"demo@example.com","password":"demo-password"}',
                },
                extract: [{ name: 'token', path: 'accessToken' }],
            },
            {
                target: {
                    method: 'POST',
                    url: `${TESTSERVER_URL}/tasks`,
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer {{token}}',
                    },
                    body: '{"title":"task-{{$uuid}}","status":"todo"}',
                },
                extract: [{ name: 'taskId', path: 'data.id' }],
            },
            {
                target: {
                    method: 'GET',
                    url: `${TESTSERVER_URL}/tasks/{{taskId}}`,
                    headers: { Authorization: 'Bearer {{token}}' },
                },
            },
        ],
    },
};

const scenarioIdSchema = z.uuid().describe('Scenario id');
const scenarioNameSchema = z
    .string()
    .trim()
    .nonempty()
    .max(SCENARIO_NAME_MAX_LENGTH)
    .describe('Display name of the scenario');

const scenarioParamsSchema = z.object({
    id: scenarioIdSchema,
});

export class ScenarioParamsDto extends createZodDto(scenarioParamsSchema) {}

const scenarioBodySchema = z
    .object({
        name: scenarioNameSchema,
        config: scenarioConfigSchema.describe(
            'Scenario config, validated with the same rules as starting a scenario test run',
        ),
    })
    .meta({ example: scenarioBodyExample, examples: [scenarioBodyExample] });

export class CreateScenarioDto extends createZodDto(scenarioBodySchema) {}

export class ReplaceScenarioDto extends createZodDto(scenarioBodySchema) {}

export type ScenarioBody = z.infer<typeof scenarioBodySchema>;

const extractRuleResponseSchema = z.object({
    name: z.string().describe('Variable name'),
    path: z.string().describe('Path in the response body'),
});

const stepTargetResponseSchema = z
    .object({
        method: z.enum(HTTP_METHODS).describe('HTTP method'),
        url: z.string().describe('URL template'),
        headers: z
            .record(z.string(), z.string())
            .optional()
            .describe('Request headers, returned unmasked'),
        body: z.string().optional().describe('Request body template'),
    })
    .describe('Request of the step');

const scenarioStepResponseSchema = z.object({
    target: stepTargetResponseSchema,
    extract: z
        .array(extractRuleResponseSchema)
        .optional()
        .describe('Variables extracted from the response'),
});

const scenarioConfigResponseSchema = z
    .object({
        steps: z.array(scenarioStepResponseSchema).describe('Scenario steps in execution order'),
    })
    .describe('Stored scenario config, returned unmasked to its owner');

const scenarioSummaryShape = {
    id: scenarioIdSchema,
    name: z.string().describe('Display name'),
    stepsCount: z.number().int().positive().describe('Number of steps'),
    createdAt: z.iso.datetime().describe('Creation time, ISO 8601'),
    updatedAt: z.iso.datetime().describe('Last update time, ISO 8601'),
};

const scenarioSummaryResponseSchema = z.object(scenarioSummaryShape);

export type ScenarioSummaryResponse = z.infer<typeof scenarioSummaryResponseSchema>;

const scenarioListResponseSchema = z
    .array(scenarioSummaryResponseSchema)
    .describe('Scenarios, newest first');

export class ScenarioListResponseDto extends createZodDto(scenarioListResponseSchema) {}

const scenarioResponseSchema = z.object({
    ...scenarioSummaryShape,
    config: scenarioConfigResponseSchema,
});

export class ScenarioResponseDto extends createZodDto(scenarioResponseSchema) {}

export type ScenarioResponse = z.infer<typeof scenarioResponseSchema>;
