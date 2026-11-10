import { applyDecorators, HttpStatus, SetMetadata } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiTooManyRequests, ApiValidationError } from '@shared/error';
import { ZOD_RESPONSE_TOKEN } from '@shared/interceptors';

import { SendRequestDto, SendRequestResponseDto } from '../../../application/dtos';
import {
    MAX_REQUEST_BODY_BYTES,
    MAX_RESPONSE_BODY_BYTES,
    REQUEST_BODY_FIELD,
    RequestOutcomeKind,
    SEND_ERROR_MESSAGES,
    SEND_REQUEST_RATE_LIMIT,
    SEND_REQUEST_RATE_LIMIT_TTL_MS,
    SendErrorCategory,
} from '../../../domain/constants';
import { REQUEST_BODY_VIOLATION_MESSAGES, RequestBodyViolation } from '../../../domain/errors';

const SECOND_MS = 1000;

const SEND_REQUEST_DESCRIPTION = [
    'Sends one HTTP request to the target on behalf of the current user and returns the response. Nothing is stored.',
    'Only the given headers are sent; redirects are not followed.',
    `The request body is at most ${MAX_REQUEST_BODY_BYTES} bytes in UTF-8 and not allowed for GET and HEAD.`,
    `The response body is read up to ${MAX_RESPONSE_BODY_BYTES} bytes and returned as text for text content types; other content types are marked as binary without a body.`,
    'Network errors of the target are returned with status 200 and kind "error"; responses of the target with any status are returned with kind "response".',
    'The timeout is set by SINGLE_REQUEST_TIMEOUT_MS and covers connecting, headers and body.',
].join(' ');

const RESPONSE_EXAMPLE = {
    kind: RequestOutcomeKind.RESPONSE,
    status: 200,
    statusText: 'OK',
    headers: [
        { name: 'content-type', value: 'application/json; charset=utf-8' },
        { name: 'set-cookie', value: 'session=abc; Path=/; HttpOnly' },
        { name: 'set-cookie', value: 'theme=dark; Path=/' },
    ],
    body: '{"id":42,"name":"Ada"}',
    sizeBytes: 22,
    durationMs: 48.731,
};

const ERROR_EXAMPLE = {
    kind: RequestOutcomeKind.ERROR,
    durationMs: 3.214,
    error: {
        category: SendErrorCategory.CONNECTION_REFUSED,
        message: SEND_ERROR_MESSAGES[SendErrorCategory.CONNECTION_REFUSED],
    },
};

export const SendRequestSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Send a single HTTP request',
            description: SEND_REQUEST_DESCRIPTION,
        }),
        ApiBody({ type: SendRequestDto }),
        ApiResponse({
            status: HttpStatus.OK,
            description: 'The response of the target, or the network error that prevented it',
            type: SendRequestResponseDto,
            examples: {
                response: { summary: 'The target responded', value: RESPONSE_EXAMPLE },
                error: { summary: 'The target refused the connection', value: ERROR_EXAMPLE },
            },
        }),
        ApiValidationError('The request failed validation', [
            {
                field: REQUEST_BODY_FIELD,
                message: REQUEST_BODY_VIOLATION_MESSAGES[RequestBodyViolation.NOT_ALLOWED],
                code: 'custom',
            },
        ]),
        ApiTooManyRequests(
            `More than ${SEND_REQUEST_RATE_LIMIT} requests per user in ${SEND_REQUEST_RATE_LIMIT_TTL_MS / SECOND_MS} seconds, or the global rate limit was exceeded`,
        ),
        SetMetadata(ZOD_RESPONSE_TOKEN, SendRequestResponseDto),
    );
