import type { OAuthProvider } from '../constants';

export interface OAuthClientCredentials {
    readonly clientId: string;
    readonly clientSecret: string;
}

export abstract class OAuthProviderSettings {
    abstract credentials(provider: OAuthProvider): OAuthClientCredentials | undefined;
    abstract callbackUrl(provider: OAuthProvider): string;
}
