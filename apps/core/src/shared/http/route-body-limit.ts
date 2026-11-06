import { type NestFastifyApplication, RouteConfig } from '@nestjs/platform-fastify';

declare module 'fastify' {
    interface FastifyContextConfig {
        bodyLimitBytes?: number;
    }
}

export const RouteBodyLimit = (bytes: number) => RouteConfig({ bodyLimitBytes: bytes });

export const enableRouteBodyLimits = (app: NestFastifyApplication): void => {
    app.getHttpAdapter()
        .getInstance()
        .addHook('onRoute', (route) => {
            const bytes = route.config?.bodyLimitBytes;
            if (bytes !== undefined) {
                route.bodyLimit = bytes;
            }
        });
};
