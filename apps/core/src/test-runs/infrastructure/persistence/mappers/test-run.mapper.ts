import type { ScenarioConfig, SingleConfig } from '../../../domain/schemas';
import { TestRun } from '../../../domain/test-run';
import type { testRuns } from '../models';

type TestRunRow = typeof testRuns.$inferSelect;
type TestRunInsert = typeof testRuns.$inferInsert;

export function toDomainTestRun(row: TestRunRow): TestRun {
    return TestRun.restore({
        id: row.id,
        type: row.type,
        status: row.status,
        config: row.config as SingleConfig | ScenarioConfig,
        createdAt: row.createdAt,
        reason: row.reason ?? undefined,
        result: row.result ?? undefined,
        startedAt: row.startedAt ?? undefined,
        finishedAt: row.finishedAt ?? undefined,
    });
}

export function toTestRunRow(run: TestRun): TestRunInsert {
    return {
        id: run.id,
        type: run.type,
        status: run.status,
        config: run.config,
        createdAt: run.createdAt,
        reason: run.reason ?? null,
        result: run.result ?? null,
        startedAt: run.startedAt ?? null,
        finishedAt: run.finishedAt ?? null,
    };
}
