import type { Provider } from '@nestjs/common';

import { OAuthProviderSettings } from '../../domain/ports';
import { GithubStrategy } from './github.strategy';
import { GoogleStrategy } from './google.strategy';
import { OAuthProviderSettingsImpl } from './oauth-provider-settings';

export * from './github.strategy';
export * from './google.strategy';
export * from './oauth-provider-settings';

export const OAUTH_INTEGRATION_PROVIDERS: Provider[] = [
    { provide: OAuthProviderSettings, useClass: OAuthProviderSettingsImpl },
    GoogleStrategy,
    GithubStrategy,
];
