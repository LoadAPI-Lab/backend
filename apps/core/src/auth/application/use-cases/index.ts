import type { Provider } from '@nestjs/common';

import { CompleteOAuthLoginUseCase } from './complete-oauth-login.use-case';
import { GetOAuthProvidersUseCase } from './get-oauth-providers.use-case';
import { LogoutUseCase } from './logout.use-case';
import { RefreshSessionUseCase } from './refresh-session.use-case';

export * from './complete-oauth-login.use-case';
export * from './get-oauth-providers.use-case';
export * from './logout.use-case';
export * from './refresh-session.use-case';

export const USE_CASES: Provider[] = [
    CompleteOAuthLoginUseCase,
    GetOAuthProvidersUseCase,
    LogoutUseCase,
    RefreshSessionUseCase,
];
