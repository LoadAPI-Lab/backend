import type { Provider } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AccessTokenGuard } from './access-token.guard';
import { OriginGuard } from './origin.guard';

export * from './access-token.guard';
export * from './oauth.guard';
export * from './origin.guard';

export const GLOBAL_GUARDS: Provider[] = [
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_GUARD, useClass: AccessTokenGuard },
];
