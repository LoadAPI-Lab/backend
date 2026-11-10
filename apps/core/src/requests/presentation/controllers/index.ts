import type { Type } from '@nestjs/common';

import { RequestsController } from './requests';

export * from './requests';

export const CONTROLLERS: Type[] = [RequestsController];
