export const ApiSpecMethod = {
    GET: 'GET',
    PUT: 'PUT',
    POST: 'POST',
    DELETE: 'DELETE',
    OPTIONS: 'OPTIONS',
    HEAD: 'HEAD',
    PATCH: 'PATCH',
} as const;
export type ApiSpecMethod = (typeof ApiSpecMethod)[keyof typeof ApiSpecMethod];

export const API_SPEC_METHODS = [
    ApiSpecMethod.GET,
    ApiSpecMethod.PUT,
    ApiSpecMethod.POST,
    ApiSpecMethod.DELETE,
    ApiSpecMethod.OPTIONS,
    ApiSpecMethod.HEAD,
    ApiSpecMethod.PATCH,
] as const;
