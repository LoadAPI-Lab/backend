import { HttpStatus } from '@nestjs/common';
import { createErrorFactory } from '@shared/error';

export const ApiSpecErrorCodes = {
    NOT_FOUND: 'API_SPEC.NOT_FOUND',
    INVALID_SYNTAX: 'API_SPEC.INVALID_SYNTAX',
    INVALID: 'API_SPEC.INVALID',
    UNSUPPORTED_VERSION: 'API_SPEC.UNSUPPORTED_VERSION',
    TOO_LARGE: 'API_SPEC.TOO_LARGE',
} as const;

export type ApiSpecErrorCode = (typeof ApiSpecErrorCodes)[keyof typeof ApiSpecErrorCodes];

export const ApiSpecErrorMessages: Record<ApiSpecErrorCode, string> = {
    [ApiSpecErrorCodes.NOT_FOUND]: 'API spec not found',
    [ApiSpecErrorCodes.INVALID_SYNTAX]: 'The document is not valid YAML or JSON',
    [ApiSpecErrorCodes.INVALID]: 'The document is not a valid OpenAPI document',
    [ApiSpecErrorCodes.UNSUPPORTED_VERSION]: 'Only OpenAPI 3.0.x and 3.1.x documents are supported',
    [ApiSpecErrorCodes.TOO_LARGE]: 'The document exceeds the maximum size of 5 MiB',
};

export const ApiSpecErrorStatuses: Record<ApiSpecErrorCode, HttpStatus> = {
    [ApiSpecErrorCodes.NOT_FOUND]: HttpStatus.NOT_FOUND,
    [ApiSpecErrorCodes.INVALID_SYNTAX]: HttpStatus.BAD_REQUEST,
    [ApiSpecErrorCodes.INVALID]: HttpStatus.BAD_REQUEST,
    [ApiSpecErrorCodes.UNSUPPORTED_VERSION]: HttpStatus.BAD_REQUEST,
    [ApiSpecErrorCodes.TOO_LARGE]: HttpStatus.PAYLOAD_TOO_LARGE,
};

export const apiSpecException = createErrorFactory(ApiSpecErrorMessages, ApiSpecErrorStatuses);
