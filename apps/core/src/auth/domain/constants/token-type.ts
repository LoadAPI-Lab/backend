export const TokenType = {
    ACCESS: 'access',
    REFRESH: 'refresh',
} as const;
export type TokenType = (typeof TokenType)[keyof typeof TokenType];
