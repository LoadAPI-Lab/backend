export const HealthErrorCodes = {
    SERVICE_UNHEALTHY: 'HEALTH.SERVICE_UNHEALTHY',
} as const;

export type HealthErrorCode = (typeof HealthErrorCodes)[keyof typeof HealthErrorCodes];

export const HealthErrorMessages: Record<HealthErrorCode, string> = {
    [HealthErrorCodes.SERVICE_UNHEALTHY]: 'The service is unavailable or not working correctly',
};
