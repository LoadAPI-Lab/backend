export const UserErrorCodes = {
    NOT_FOUND: 'USER.NOT_FOUND',
} as const;

export type UserErrorCode = (typeof UserErrorCodes)[keyof typeof UserErrorCodes];

export const UserErrorMessages: Record<UserErrorCode, string> = {
    [UserErrorCodes.NOT_FOUND]: 'User not found',
};
