import type { Provider } from '@nestjs/common';

import { LiveFeed, SnapshotHistory, TestRunStopper } from '../../domain/ports';
import { LiveFeedImpl } from './live-feed';
import { SnapshotHistoryImpl } from './snapshot-history';
import { TestRunStopperImpl } from './test-run-stopper';

export * from './constants';
export * from './live-feed';
export * from './snapshot-history';
export * from './test-run-stopper';

export const REDIS_PROVIDERS: Provider[] = [
    { provide: TestRunStopper, useClass: TestRunStopperImpl },
    { provide: LiveFeed, useClass: LiveFeedImpl },
    { provide: SnapshotHistory, useClass: SnapshotHistoryImpl },
];
