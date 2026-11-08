export const ParameterLocation = {
    PATH: 'path',
    QUERY: 'query',
    HEADER: 'header',
    COOKIE: 'cookie',
} as const;
export type ParameterLocation = (typeof ParameterLocation)[keyof typeof ParameterLocation];

export const PARAMETER_LOCATIONS = [
    ParameterLocation.PATH,
    ParameterLocation.QUERY,
    ParameterLocation.HEADER,
    ParameterLocation.COOKIE,
] as const;
