import type { Provider } from '@nestjs/common';

import { ExpireStaleTestRunsUseCase } from './expire-stale-test-runs.use-case';
import { GetTestRunUseCase } from './get-test-run.use-case';
import { HandleWorkerEventUseCase } from './handle-worker-event.use-case';
import { ListTestRunsUseCase } from './list-test-runs.use-case';
import { RerunTestRunUseCase } from './rerun-test-run.use-case';
import { StartTestRunUseCase } from './start-test-run.use-case';
import { StopTestRunUseCase } from './stop-test-run.use-case';
import { WatchTestRunUseCase } from './watch-test-run.use-case';

export * from './expire-stale-test-runs.use-case';
export * from './get-test-run.use-case';
export * from './handle-worker-event.use-case';
export * from './list-test-runs.use-case';
export * from './rerun-test-run.use-case';
export * from './start-test-run.use-case';
export * from './stop-test-run.use-case';
export * from './watch-test-run.use-case';

export const USE_CASES: Provider[] = [
    StartTestRunUseCase,
    RerunTestRunUseCase,
    GetTestRunUseCase,
    ListTestRunsUseCase,
    StopTestRunUseCase,
    WatchTestRunUseCase,
    HandleWorkerEventUseCase,
    ExpireStaleTestRunsUseCase,
];
