import type { Type } from '@nestjs/common';

import { TestRunsController } from './test-runs';

export * from './test-runs';

export const CONTROLLERS: Type[] = [TestRunsController];
