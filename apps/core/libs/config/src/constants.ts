export const NodeEnv = {
    DEVELOPMENT: 'development',
    PRODUCTION: 'production',
    TEST: 'test',
} as const;
export type NodeEnv = (typeof NodeEnv)[keyof typeof NodeEnv];
