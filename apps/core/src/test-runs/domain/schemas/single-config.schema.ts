import { z } from 'zod/v4';

import { MAX_DURATION_SECONDS, MAX_TARGET_RPS } from '../constants';
import { targetSchema } from './target.schema';

const MIN_TARGET_RPS = 1;
const MIN_DURATION_SECONDS = 1;
const MIN_RAMP_UP_SECONDS = 0;

const targetRpsSchema = z.number().superRefine((value, ctx) => {
    if (!Number.isInteger(value)) {
        ctx.addIssue({ code: 'custom', message: `targetRps must be an integer, got ${value}` });
        return;
    }

    if (value < MIN_TARGET_RPS || value > MAX_TARGET_RPS) {
        ctx.addIssue({
            code: 'custom',
            message: `targetRps must be between ${MIN_TARGET_RPS} and ${MAX_TARGET_RPS}, got ${value}`,
        });
    }
});

const durationSecondsSchema = z.number().superRefine((value, ctx) => {
    if (!Number.isInteger(value)) {
        ctx.addIssue({
            code: 'custom',
            message: `durationSeconds must be an integer, got ${value}`,
        });
        return;
    }

    if (value < MIN_DURATION_SECONDS || value > MAX_DURATION_SECONDS) {
        ctx.addIssue({
            code: 'custom',
            message: `durationSeconds must be between ${MIN_DURATION_SECONDS} and ${MAX_DURATION_SECONDS}, got ${value}`,
        });
    }
});

const rampUpSecondsSchema = z.number().superRefine((value, ctx) => {
    if (!Number.isInteger(value)) {
        ctx.addIssue({ code: 'custom', message: `rampUpSeconds must be an integer, got ${value}` });
        return;
    }

    if (value < MIN_RAMP_UP_SECONDS) {
        ctx.addIssue({
            code: 'custom',
            message: `rampUpSeconds must be at least ${MIN_RAMP_UP_SECONDS}, got ${value}`,
        });
    }
});

export const singleConfigSchema = z
    .object({
        target: targetSchema,
        targetRps: targetRpsSchema,
        durationSeconds: durationSecondsSchema,
        rampUpSeconds: rampUpSecondsSchema.optional(),
    })
    .superRefine((config, ctx) => {
        if (config.rampUpSeconds !== undefined && config.rampUpSeconds > config.durationSeconds) {
            ctx.addIssue({
                code: 'custom',
                message: `rampUpSeconds must be between 0 and durationSeconds (${config.durationSeconds}), got ${config.rampUpSeconds}`,
                path: ['rampUpSeconds'],
            });
        }
    });

export type SingleConfig = z.infer<typeof singleConfigSchema>;
