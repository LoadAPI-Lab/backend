import type { Type } from '@nestjs/common';

import { AuthController } from './auth';
import { OAuthController } from './oauth';

export * from './auth';
export * from './oauth';

export const CONTROLLERS: Type[] = [AuthController, OAuthController];
