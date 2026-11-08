import { Logger } from '@nestjs/common';

import { maskTestRunConfig, maskUrl } from '../../domain/config-masking';
import { TestType } from '../../domain/constants';
import {
    loadTestResultSchema,
    scenarioResultSchema,
    type LoadTestResult,
    type ScenarioResult,
} from '../../domain/schemas';
import type { TestRun } from '../../domain/test-run';
import type { TestRunListItem, TestRunResponse } from '../dtos';

const logger = new Logger('TestRunResponseMapper');
const SINGLE_TARGET_INDEX = 0;

type ParsedResult =
    | { type: typeof TestType.SINGLE; result: LoadTestResult }
    | { type: typeof TestType.SCENARIO; result: ScenarioResult };

const maskLoadTestResult = (result: LoadTestResult): LoadTestResult => ({
    ...result,
    targets: result.targets.map((target) => ({ ...target, url: maskUrl(target.url) })),
});

const maskScenarioResult = (result: ScenarioResult): ScenarioResult => ({
    ...result,
    steps: result.steps.map((step) => ({ ...step, url: maskUrl(step.url) })),
});

const parseResult = (run: TestRun): ParsedResult | undefined => {
    if (run.result === undefined) {
        return undefined;
    }

    if (run.type === TestType.SINGLE) {
        const parsed = loadTestResultSchema.safeParse(run.result);
        if (parsed.success) {
            return { type: TestType.SINGLE, result: maskLoadTestResult(parsed.data) };
        }
    } else if (run.type === TestType.SCENARIO) {
        const parsed = scenarioResultSchema.safeParse(run.result);
        if (parsed.success) {
            return { type: TestType.SCENARIO, result: maskScenarioResult(parsed.data) };
        }
    }

    logger.warn(`Stored result of test run ${run.id} does not match the expected shape`);
    return undefined;
};

const toP95Ms = (parsed: ParsedResult | undefined): number | undefined => {
    if (parsed?.type !== TestType.SINGLE) {
        return undefined;
    }

    return parsed.result.targets[SINGLE_TARGET_INDEX]?.responseTime?.p95Ms;
};

const toOkCount = (parsed: ParsedResult | undefined): number | undefined => {
    if (parsed?.type !== TestType.SCENARIO) {
        return undefined;
    }

    return parsed.result.summary.okCount;
};

const toBaseFields = (run: TestRun) => ({
    id: run.id,
    type: run.type,
    status: run.status,
    createdAt: run.createdAt.toISOString(),
    ...(run.startedAt !== undefined && { startedAt: run.startedAt.toISOString() }),
    ...(run.finishedAt !== undefined && { finishedAt: run.finishedAt.toISOString() }),
    ...(run.reason !== undefined && { reason: run.reason }),
});

export const toTestRunListItem = (run: TestRun): TestRunListItem => {
    const { config } = run;
    const parsed = parseResult(run);
    const p95Ms = toP95Ms(parsed);
    const okCount = toOkCount(parsed);

    return {
        ...toBaseFields(run),
        ...('target' in config && {
            request: { method: config.target.method, url: maskUrl(config.target.url) },
            targetRps: config.targetRps,
            durationSeconds: config.durationSeconds,
        }),
        ...(p95Ms !== undefined && { p95Ms }),
        ...('steps' in config && { stepsCount: config.steps.length }),
        ...(okCount !== undefined && { okCount }),
    };
};

export const toTestRunResponse = (run: TestRun): TestRunResponse => {
    const result = parseResult(run)?.result;

    return {
        ...toBaseFields(run),
        config: maskTestRunConfig(run.config),
        ...(result !== undefined && { result }),
    };
};
