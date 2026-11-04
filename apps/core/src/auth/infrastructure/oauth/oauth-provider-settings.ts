import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { OAuthProvider, oauthCallbackPath } from '../../domain/constants';
import { type OAuthClientCredentials, OAuthProviderSettings } from '../../domain/ports';

const toCredentials = (
    clientId: string | undefined,
    clientSecret: string | undefined,
): OAuthClientCredentials | undefined =>
    clientId && clientSecret ? { clientId, clientSecret } : undefined;

@Injectable()
export class OAuthProviderSettingsImpl implements OAuthProviderSettings {
    private readonly apiBaseUrl: string;
    private readonly credentialsByProvider: Record<
        OAuthProvider,
        OAuthClientCredentials | undefined
    >;

    constructor(cfg: ConfigService) {
        const publicUrl = cfg.get('API_PUBLIC_URL') ?? `http://localhost:${cfg.get('PORT')}`;
        this.apiBaseUrl = publicUrl.replace(/\/+$/, '');
        this.credentialsByProvider = {
            [OAuthProvider.GOOGLE]: toCredentials(
                cfg.get('GOOGLE_CLIENT_ID'),
                cfg.get('GOOGLE_CLIENT_SECRET'),
            ),
            [OAuthProvider.GITHUB]: toCredentials(
                cfg.get('GITHUB_CLIENT_ID'),
                cfg.get('GITHUB_CLIENT_SECRET'),
            ),
        };
    }

    credentials(provider: OAuthProvider): OAuthClientCredentials | undefined {
        return this.credentialsByProvider[provider];
    }

    callbackUrl(provider: OAuthProvider): string {
        return `${this.apiBaseUrl}${oauthCallbackPath(provider)}`;
    }
}
