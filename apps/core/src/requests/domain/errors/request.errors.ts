import { HttpStatus } from '@nestjs/common';
import { createErrorFactory } from '@shared/error';

export const RequestErrorCodes = {
    TARGET_NOT_ALLOWED: 'REQUEST.TARGET_NOT_ALLOWED',
} as const;

export type RequestErrorCode = (typeof RequestErrorCodes)[keyof typeof RequestErrorCodes];

export const RequestErrorMessages: Record<RequestErrorCode, string> = {
    [RequestErrorCodes.TARGET_NOT_ALLOWED]: 'The target address is not allowed',
};

export const RequestErrorStatuses: Record<RequestErrorCode, HttpStatus> = {
    [RequestErrorCodes.TARGET_NOT_ALLOWED]: HttpStatus.BAD_REQUEST,
};

export const requestException = createErrorFactory(RequestErrorMessages, RequestErrorStatuses);
