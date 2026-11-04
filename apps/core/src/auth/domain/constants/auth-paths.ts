import { API_PREFIX } from '@shared/constants';

import type { OAuthProvider } from './oauth-provider';

export const REFRESH_TOKEN_COOKIE_PATH = `${API_PREFIX}/auth` as const;
export const OAUTH_STATE_COOKIE_PATH = `${API_PREFIX}/oauth` as const;

export const oauthCallbackPath = (provider: OAuthProvider) =>
    `${API_PREFIX}/oauth/${provider}/callback` as const;

export const FRONTEND_OAUTH_CALLBACK_PATH = '/oauth/callback';

export function oauthCallbackUrl(frontendUrl: string, errorCode?: string): string {
    const url = `${frontendUrl.replace(/\/+$/, '')}${FRONTEND_OAUTH_CALLBACK_PATH}`;
    if (errorCode === undefined) {
        return url;
    }
    return `${url}?${new URLSearchParams({ error: errorCode }).toString()}`;
}
