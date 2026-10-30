import { z } from 'zod/v4';

import { MAX_SCENARIO_STEPS } from '../constants';
import { missingVariablesByStep } from '../validation';
import { targetSchema } from './target.schema';

const MIN_SCENARIO_STEPS = 1;
const MIN_EXTRACT_PATH_LENGTH = 1;
const FIRST_STEP_NUMBER = 1;

const extractRuleSchema = z.object({
    name: z.string().regex(/^\w+$/, String.raw`extract rule name must match ^\w+$`),
    path: z.string().min(MIN_EXTRACT_PATH_LENGTH, 'extract rule path must not be empty'),
});

const stepSchema = z.object({
    target: targetSchema,
    extract: z.array(extractRuleSchema).optional(),
});

export const scenarioConfigSchema = z
    .object({
        steps: z
            .array(stepSchema)
            .min(MIN_SCENARIO_STEPS, 'scenario has no steps')
            .max(MAX_SCENARIO_STEPS, `scenario cannot have more than ${MAX_SCENARIO_STEPS} steps`),
    })
    .superRefine((config, ctx) => {
        missingVariablesByStep(config.steps).forEach((missing, index) => {
            if (missing.length) {
                const stepNumber = index + FIRST_STEP_NUMBER;
                ctx.addIssue({
                    code: 'custom',
                    message: `step ${stepNumber} uses variables that no earlier step extracts: ${missing.join(', ')}`,
                    path: ['steps', index],
                });
            }
        });
    });

export type ScenarioConfig = z.infer<typeof scenarioConfigSchema>;
