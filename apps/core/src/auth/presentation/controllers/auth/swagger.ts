import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiErrorResponse } from '@shared/error';

import { AuthErrorCodes, AuthErrorMessages } from '../../../domain/errors';

const ApiOriginNotAllowed = () =>
    ApiErrorResponse(
        HttpStatus.FORBIDDEN,
        AuthErrorCodes.ORIGIN_NOT_ALLOWED,
        AuthErrorMessages[AuthErrorCodes.ORIGIN_NOT_ALLOWED],
    );

export const RefreshSessionSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Refresh the session',
            description:
                'Reads the refresh_token cookie, rotates it and sets new access_token and refresh_token cookies. A refresh token that was already used revokes the whole session. Every 401 clears both cookies. Public.',
        }),
        ApiResponse({
            status: HttpStatus.NO_CONTENT,
            description: 'New auth cookies were set',
        }),
        ApiErrorResponse(
            HttpStatus.UNAUTHORIZED,
            AuthErrorCodes.SESSION_INVALID,
            AuthErrorMessages[AuthErrorCodes.SESSION_INVALID],
        ),
        ApiOriginNotAllowed(),
    );

export const LogoutSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Sign out',
            description:
                'Revokes the session of the refresh_token cookie when it is valid and always clears both auth cookies. Idempotent. Public.',
        }),
        ApiResponse({
            status: HttpStatus.NO_CONTENT,
            description: 'The auth cookies were cleared',
        }),
        ApiOriginNotAllowed(),
    );
