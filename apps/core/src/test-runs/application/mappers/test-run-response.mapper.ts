import type { TestRun } from '../../domain/test-run';
import type { TestRunListItem, TestRunResponse } from '../dtos';

export const toTestRunResponse = (run: TestRun): TestRunResponse => ({
    id: run.id,
    type: run.type,
    status: run.status,
    createdAt: run.createdAt.toISOString(),
    ...(run.startedAt !== undefined && { startedAt: run.startedAt.toISOString() }),
    ...(run.finishedAt !== undefined && { finishedAt: run.finishedAt.toISOString() }),
    ...(run.reason !== undefined && { reason: run.reason }),
    ...(run.result !== undefined && { result: run.result }),
});

export const toTestRunListItem = (run: TestRun): TestRunListItem => ({
    id: run.id,
    type: run.type,
    status: run.status,
    createdAt: run.createdAt.toISOString(),
    ...(run.startedAt !== undefined && { startedAt: run.startedAt.toISOString() }),
    ...(run.finishedAt !== undefined && { finishedAt: run.finishedAt.toISOString() }),
    ...(run.reason !== undefined && { reason: run.reason }),
});
