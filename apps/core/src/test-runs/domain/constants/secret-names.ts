export const AUTHORIZATION_HEADER_NAMES = ['authorization', 'proxy-authorization'] as const;

export const SECRET_HEADER_NAMES = [
    ...AUTHORIZATION_HEADER_NAMES,
    'cookie',
    'x-api-key',
    'api-key',
    'x-auth-token',
] as const;

export const SECRET_HEADER_NAME_PARTS = [
    'token',
    'secret',
    'password',
    'apikey',
    'session',
] as const;

export const SECRET_QUERY_PARAM_NAMES = [
    'api_key',
    'access_token',
    'token',
    'key',
    'secret',
    'password',
    'signature',
] as const;

export const SECRET_QUERY_PARAM_NAME_PARTS = ['token', 'secret', 'password'] as const;

export const MASKED_VALUE = '***';
