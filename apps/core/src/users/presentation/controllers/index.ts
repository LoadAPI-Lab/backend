import type { Type } from '@nestjs/common';

import { UsersController } from './users';

export * from './users';

export const CONTROLLERS: Type[] = [UsersController];
