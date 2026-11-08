import { Logger } from '@nestjs/common';

import { TestType } from '../../domain/constants';
import { storedScenarioResultSchema, storedSingleResultSchema } from '../../domain/schemas';
import type { TestRun } from '../../domain/test-run';
import type { TestRunListItem, TestRunResponse, TestRunSummary } from '../dtos';

const logger = new Logger('TestRunResponseMapper');

const toSummary = (run: TestRun): TestRunSummary | undefined => {
    if (run.result === undefined) {
        return undefined;
    }

    if (run.type === TestType.SINGLE) {
        const parsed = storedSingleResultSchema.safeParse(run.result);
        if (parsed.success) {
            const {
                targets: [target],
                ...totals
            } = parsed.data;
            return { ...totals, ...target };
        }
    } else if (run.type === TestType.SCENARIO) {
        const parsed = storedScenarioResultSchema.safeParse(run.result);
        if (parsed.success) {
            return parsed.data.summary;
        }
    }

    logger.warn(`Stored result of test run ${run.id} does not match the expected summary shape`);
    return undefined;
};

export const toTestRunListItem = (run: TestRun): TestRunListItem => {
    const { config } = run;
    const summary = toSummary(run);

    return {
        id: run.id,
        type: run.type,
        status: run.status,
        createdAt: run.createdAt.toISOString(),
        ...(run.startedAt !== undefined && { startedAt: run.startedAt.toISOString() }),
        ...(run.finishedAt !== undefined && { finishedAt: run.finishedAt.toISOString() }),
        ...(run.reason !== undefined && { reason: run.reason }),
        ...('target' in config && {
            request: { method: config.target.method, url: config.target.url },
            load: {
                targetRps: config.targetRps,
                durationSeconds: config.durationSeconds,
                ...(config.rampUpSeconds !== undefined && {
                    rampUpSeconds: config.rampUpSeconds,
                }),
            },
        }),
        ...('steps' in config && { stepsCount: config.steps.length }),
        ...(summary !== undefined && { summary }),
    };
};

export const toTestRunResponse = (run: TestRun): TestRunResponse => ({
    ...toTestRunListItem(run),
    ...(run.result !== undefined && { result: run.result }),
});
