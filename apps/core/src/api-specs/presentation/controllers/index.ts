import type { Type } from '@nestjs/common';

import { ApiSpecsController } from './api-specs';

export * from './api-specs';

export const CONTROLLERS: Type[] = [ApiSpecsController];
