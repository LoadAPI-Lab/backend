import { applyDecorators, HttpStatus, SetMetadata } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ZOD_RESPONSE_TOKEN } from '@shared/interceptors';

import { OAuthProvidersResponseDto } from '../../../application/dtos';
import {
    FRONTEND_OAUTH_CALLBACK_PATH,
    OAUTH_PROVIDERS,
    OAuthProvider,
} from '../../../domain/constants';

const ApiProviderParam = () =>
    ApiParam({
        name: 'provider',
        description: 'OAuth provider id',
        enum: OAUTH_PROVIDERS,
        example: OAuthProvider.GITHUB,
    });

const FRONTEND_ERROR_REDIRECT = `On any error redirects to FRONTEND_URL${FRONTEND_OAUTH_CALLBACK_PATH}?error=<code> instead of returning JSON.`;

export const GetOAuthProvidersSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'List OAuth providers',
            description: 'Returns the OAuth providers configured on the server. Public.',
        }),
        ApiResponse({
            status: HttpStatus.OK,
            description: 'Configured OAuth providers',
            type: OAuthProvidersResponseDto,
        }),
        SetMetadata(ZOD_RESPONSE_TOKEN, OAuthProvidersResponseDto),
    );

export const StartOAuthSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Start OAuth sign-in',
            description: `Sets the oauth_state cookie and redirects to the provider's consent page. ${FRONTEND_ERROR_REDIRECT} Public.`,
        }),
        ApiProviderParam(),
        ApiResponse({
            status: HttpStatus.FOUND,
            description: 'Redirect to the provider, or to the frontend with an error code',
        }),
    );

export const OAuthCallbackSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Finish OAuth sign-in',
            description: `Called by the provider. Checks the state, signs the user in or registers them, sets the access_token and refresh_token cookies and redirects to FRONTEND_URL${FRONTEND_OAUTH_CALLBACK_PATH}. ${FRONTEND_ERROR_REDIRECT} Public.`,
        }),
        ApiProviderParam(),
        ApiResponse({
            status: HttpStatus.FOUND,
            description: 'Redirect to the frontend, with an error code on failure',
        }),
    );
