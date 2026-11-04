import { ACCESS_TOKEN_COOKIE } from '@shared/constants';

import { OAUTH_STATE_COOKIE_PATH, REFRESH_TOKEN_COOKIE_PATH } from './auth-paths';

export const AuthCookieName = {
    ACCESS_TOKEN: ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN: 'refresh_token',
    OAUTH_STATE: 'oauth_state',
} as const;
export type AuthCookieName = (typeof AuthCookieName)[keyof typeof AuthCookieName];

export const AuthCookiePath = {
    ACCESS_TOKEN: '/',
    REFRESH_TOKEN: REFRESH_TOKEN_COOKIE_PATH,
    OAUTH_STATE: OAUTH_STATE_COOKIE_PATH,
} as const;
export type AuthCookiePath = (typeof AuthCookiePath)[keyof typeof AuthCookiePath];

export const OAUTH_STATE_TTL_SECONDS = 300;
