import {
    type CallHandler,
    type ExecutionContext,
    Logger,
    type NestInterceptor,
} from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyRequest } from 'fastify';
import { utilities, WinstonModule } from 'nest-winston';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { format, transports } from 'winston';

const SENSITIVE_KEYS = [
    'password',
    'token',
    'access',
    'refresh',
    'code',
    'secret',
    'authorization',
    'cookie',
];

export function setupLogger(
    app: NestFastifyApplication,
    serviceName: string,
    isProduction: boolean,
) {
    const logger = WinstonModule.createLogger({
        level: isProduction ? 'info' : 'debug',
        format: format.combine(
            format.timestamp(),
            format.errors({ stack: true }),
            isProduction
                ? format.json()
                : format.combine(
                      format.ms(),
                      utilities.format.nestLike(serviceName, { colors: true }),
                  ),
        ),
        transports: [new transports.Console()],
    });

    app.useLogger(logger);
    app.useGlobalInterceptors(new RequestLoggingInterceptor(!isProduction));
}

class RequestLoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('HTTP');

    constructor(private readonly logBody: boolean) {}

    intercept(context: ExecutionContext, next: CallHandler) {
        if (context.getType() !== 'http') {
            return next.handle();
        }

        const request = context.switchToHttp().getRequest<FastifyRequest>();
        const startedAt = Date.now();
        const meta = {
            requestId: request.id,
            method: request.method,
            path: request.url.split('?')[0],
            handler: `${context.getClass().name}.${context.getHandler().name}`,
        };

        this.logger.debug({
            message: `--> ${meta.method} ${meta.path}`,
            ...meta,
            ...(this.logBody && { query: request.query, body: sanitize(request.body) }),
        });

        return next.handle().pipe(
            tap(() => {
                this.logger.log({
                    message: `<-- ${meta.method} ${meta.path} ${Date.now() - startedAt}ms`,
                    ...meta,
                });
            }),
            catchError((error: { status?: number }) => {
                this.logger.warn({
                    message: `<-- ${meta.method} ${meta.path} ${error.status ?? 500} ${Date.now() - startedAt}ms`,
                    ...meta,
                });
                return throwError(() => error);
            }),
        );
    }
}

function sanitize(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(sanitize);
    }
    if (value === null || typeof value !== 'object') {
        return value;
    }
    return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
            key,
            SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive))
                ? '***'
                : sanitize(item),
        ]),
    );
}
