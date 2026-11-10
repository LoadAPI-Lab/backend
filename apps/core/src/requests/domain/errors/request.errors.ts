import { HttpStatus } from '@nestjs/common';
import { createErrorFactory, ErrorCode } from '@shared/error';

export const RequestErrorCodes = {
    INVALID_REQUEST: ErrorCode.VALIDATION_FAILED,
} as const;

export type RequestErrorCode = (typeof RequestErrorCodes)[keyof typeof RequestErrorCodes];

export const RequestErrorMessages: Record<RequestErrorCode, string> = {
    [RequestErrorCodes.INVALID_REQUEST]: 'The request data failed validation',
};

export const RequestErrorStatuses: Record<RequestErrorCode, HttpStatus> = {
    [RequestErrorCodes.INVALID_REQUEST]: HttpStatus.BAD_REQUEST,
};

export const requestException = createErrorFactory(RequestErrorMessages, RequestErrorStatuses);
