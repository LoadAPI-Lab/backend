import type { Provider } from '@nestjs/common';

import { WatchdogScheduler } from './watchdog.scheduler';

export * from './watchdog.scheduler';

export const SCHEDULERS: Provider[] = [WatchdogScheduler];
