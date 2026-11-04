import { HttpStatus } from '@nestjs/common';
import { UNAUTHENTICATED_ERROR_CODE, UNAUTHENTICATED_ERROR_MESSAGE } from '@shared/constants';
import { createErrorFactory } from '@shared/error';

export const AuthErrorCodes = {
    UNAUTHENTICATED: UNAUTHENTICATED_ERROR_CODE,
    SESSION_INVALID: 'AUTH.SESSION_INVALID',
    ORIGIN_NOT_ALLOWED: 'AUTH.ORIGIN_NOT_ALLOWED',
} as const;

export type AuthErrorCode = (typeof AuthErrorCodes)[keyof typeof AuthErrorCodes];

export const AuthErrorMessages: Record<AuthErrorCode, string> = {
    [AuthErrorCodes.UNAUTHENTICATED]: UNAUTHENTICATED_ERROR_MESSAGE,
    [AuthErrorCodes.SESSION_INVALID]: 'The session is invalid or has expired, sign in again',
    [AuthErrorCodes.ORIGIN_NOT_ALLOWED]: 'Requests from this origin are not allowed',
};

export const AuthErrorStatuses: Record<AuthErrorCode, HttpStatus> = {
    [AuthErrorCodes.UNAUTHENTICATED]: HttpStatus.UNAUTHORIZED,
    [AuthErrorCodes.SESSION_INVALID]: HttpStatus.UNAUTHORIZED,
    [AuthErrorCodes.ORIGIN_NOT_ALLOWED]: HttpStatus.FORBIDDEN,
};

export const authException = createErrorFactory(AuthErrorMessages, AuthErrorStatuses);
