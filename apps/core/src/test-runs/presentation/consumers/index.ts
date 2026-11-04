import type { Provider } from '@nestjs/common';

import { WorkerEventsConsumer } from './worker-events.consumer';

export * from './worker-events.consumer';

export const CONSUMERS: Provider[] = [WorkerEventsConsumer];
