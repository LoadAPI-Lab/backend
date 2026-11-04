import { Injectable } from '@nestjs/common';

import { OAUTH_PROVIDER_LABELS, OAUTH_PROVIDERS } from '../../domain/constants';
import { OAuthProviderSettings } from '../../domain/ports';
import type { OAuthProvidersResponse } from '../dtos';

@Injectable()
export class GetOAuthProvidersUseCase {
    constructor(private readonly settings: OAuthProviderSettings) {}

    execute(): OAuthProvidersResponse {
        return OAUTH_PROVIDERS.filter((provider) => this.settings.credentials(provider)).map(
            (provider) => ({ id: provider, name: OAUTH_PROVIDER_LABELS[provider] }),
        );
    }
}
