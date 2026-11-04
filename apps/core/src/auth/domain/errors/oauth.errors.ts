import { HttpStatus } from '@nestjs/common';
import { BaseException } from '@shared/error';

export const OAuthErrorCodes = {
    PROVIDER_NOT_SUPPORTED: 'OAUTH.PROVIDER_NOT_SUPPORTED',
    PROVIDER_NOT_CONFIGURED: 'OAUTH.PROVIDER_NOT_CONFIGURED',
    STATE_MISMATCH: 'OAUTH.STATE_MISMATCH',
    PROVIDER_DENIED: 'OAUTH.PROVIDER_DENIED',
    PROFILE_INVALID: 'OAUTH.PROFILE_INVALID',
    EMAIL_NOT_VERIFIED: 'OAUTH.EMAIL_NOT_VERIFIED',
    AUTHENTICATION_FAILED: 'OAUTH.AUTHENTICATION_FAILED',
} as const;

export type OAuthErrorCode = (typeof OAuthErrorCodes)[keyof typeof OAuthErrorCodes];

export const OAuthErrorMessages: Record<OAuthErrorCode, string> = {
    [OAuthErrorCodes.PROVIDER_NOT_SUPPORTED]: 'This OAuth provider is not supported',
    [OAuthErrorCodes.PROVIDER_NOT_CONFIGURED]: 'This OAuth provider is not configured',
    [OAuthErrorCodes.STATE_MISMATCH]: 'The OAuth state does not match, start the sign-in again',
    [OAuthErrorCodes.PROVIDER_DENIED]: 'The OAuth provider denied the sign-in',
    [OAuthErrorCodes.PROFILE_INVALID]: 'The OAuth provider returned an invalid profile',
    [OAuthErrorCodes.EMAIL_NOT_VERIFIED]: 'The account has no verified email address',
    [OAuthErrorCodes.AUTHENTICATION_FAILED]: 'OAuth authentication failed',
};

const OAUTH_ERROR_STATUSES: Record<OAuthErrorCode, HttpStatus> = {
    [OAuthErrorCodes.PROVIDER_NOT_SUPPORTED]: HttpStatus.NOT_FOUND,
    [OAuthErrorCodes.PROVIDER_NOT_CONFIGURED]: HttpStatus.NOT_FOUND,
    [OAuthErrorCodes.STATE_MISMATCH]: HttpStatus.BAD_REQUEST,
    [OAuthErrorCodes.PROVIDER_DENIED]: HttpStatus.UNAUTHORIZED,
    [OAuthErrorCodes.PROFILE_INVALID]: HttpStatus.BAD_GATEWAY,
    [OAuthErrorCodes.EMAIL_NOT_VERIFIED]: HttpStatus.FORBIDDEN,
    [OAuthErrorCodes.AUTHENTICATION_FAILED]: HttpStatus.BAD_GATEWAY,
};

export const oauthException = (code: OAuthErrorCode): BaseException =>
    new BaseException({ code, message: OAuthErrorMessages[code] }, OAUTH_ERROR_STATUSES[code]);
