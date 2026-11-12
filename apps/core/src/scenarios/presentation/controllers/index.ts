import type { Type } from '@nestjs/common';

import { ScenariosController } from './scenarios';

export * from './scenarios';

export const CONTROLLERS: Type[] = [ScenariosController];
