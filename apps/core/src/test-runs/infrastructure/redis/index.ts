import type { Provider } from '@nestjs/common';

import { LiveFeed, TestRunStopper } from '../../domain/ports';
import { LiveFeedImpl } from './live-feed';
import { TestRunStopperImpl } from './test-run-stopper';

export * from './constants';
export * from './live-feed';
export * from './test-run-stopper';

export const REDIS_PROVIDERS: Provider[] = [
    { provide: TestRunStopper, useClass: TestRunStopperImpl },
    { provide: LiveFeed, useClass: LiveFeedImpl },
];
