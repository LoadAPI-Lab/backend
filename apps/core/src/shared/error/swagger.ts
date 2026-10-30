import { applyDecorators } from '@nestjs/common';
import { ApiResponse, getSchemaPath } from '@nestjs/swagger';

import { GlobalErrorResponse } from './schema';

type TDetails = { field: string; message: string; code: string }[];

export const ApiErrorResponse = (
    status: number,
    bizCode: string,
    description: string,
    details: TDetails = [],
) =>
    ApiResponse({
        status,
        description,
        schema: {
            allOf: [{ $ref: getSchemaPath(GlobalErrorResponse.Output) }],
            example: {
                success: false,
                error: {
                    code: bizCode,
                    message: description,
                    retryable: status >= 500,
                },
                details: details || [],
                meta: {
                    request: {
                        requestId: 'req-clj1abc230000jk78',
                        path: '/v1/...',
                        method: 'POST',
                        ip: '127.0.0.1',
                    },
                    timestamp: new Date().toISOString(),
                    service: 'core',
                },
            },
        },
    });

export const ApiBadRequest = (description: string = 'Invalid request') =>
    applyDecorators(ApiErrorResponse(400, 'BAD_REQUEST', description));

export const ApiUnauthorized = (
    description: string = 'The session has expired or the token is invalid',
) => applyDecorators(ApiErrorResponse(401, 'AUTH_REQUIRED', description));

export const ApiForbidden = (
    description: string = 'You do not have sufficient permissions for this action',
) => applyDecorators(ApiErrorResponse(403, 'ACCESS_DENIED', description));

export const ApiNotFound = (description: string = 'Resource not found') =>
    applyDecorators(ApiErrorResponse(404, 'NOT_FOUND', description));

export const ApiValidationError = (
    description: string = 'Input data failed validation',
    fields: TDetails = [],
) => applyDecorators(ApiErrorResponse(400, 'VALIDATION_FAILED', description, fields));

export const ApiConflict = (description: string = 'The resource already exists') =>
    applyDecorators(ApiErrorResponse(409, 'CONFLICT', description));

export const ApiTooManyRequests = (description: string = 'Too many attempts') =>
    applyDecorators(ApiErrorResponse(429, 'TOO_MANY_REQUESTS', description));

export const ApiServiceUnavailable = (
    description: string = 'The service is temporarily unavailable',
) => applyDecorators(ApiErrorResponse(503, 'SERVICE_UNAVAILABLE', description));
