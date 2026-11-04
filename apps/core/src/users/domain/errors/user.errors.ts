import { HttpStatus } from '@nestjs/common';
import { createErrorFactory } from '@shared/error';

export const UserErrorCodes = {
    NOT_FOUND: 'USER.NOT_FOUND',
} as const;

export type UserErrorCode = (typeof UserErrorCodes)[keyof typeof UserErrorCodes];

export const UserErrorMessages: Record<UserErrorCode, string> = {
    [UserErrorCodes.NOT_FOUND]: 'User not found',
};

export const UserErrorStatuses: Record<UserErrorCode, HttpStatus> = {
    [UserErrorCodes.NOT_FOUND]: HttpStatus.NOT_FOUND,
};

export const userException = createErrorFactory(UserErrorMessages, UserErrorStatuses);
