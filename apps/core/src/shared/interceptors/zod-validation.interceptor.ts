import {
    CallHandler,
    ExecutionContext,
    HttpStatus,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { SKIP_CONTRACT } from '@shared/decorators';
import { BaseException } from '@shared/error';
import { map, Observable } from 'rxjs';
import { z } from 'zod/v4';

export const ZOD_RESPONSE_TOKEN = 'ZOD_RESPONSE_TOKEN';

@Injectable()
export class ZodValidationInterceptor implements NestInterceptor<unknown, unknown> {
    private readonly isDev: boolean;

    constructor(
        private readonly reflector: Reflector,
        private readonly configService: ConfigService,
    ) {
        this.isDev = this.configService.get('NODE_ENV') === 'development';
    }

    intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
        if (context.getType() !== 'http') {
            return next.handle();
        }

        const handler = context.getHandler();
        const skipValidation = this.reflector.get<boolean>(SKIP_CONTRACT, handler);

        if (skipValidation) {
            return next.handle();
        }

        const metadata = this.reflector.get<{ schema: z.ZodTypeAny } | undefined>(
            ZOD_RESPONSE_TOKEN,
            handler,
        );
        const schema = metadata ? metadata.schema : undefined;

        return next.handle().pipe(
            map((data) => {
                if (!schema) {
                    throw new BaseException(
                        {
                            code: 'MISSING_VALIDATION_SCHEMA',
                            message: 'No response schema was declared for this endpoint',
                        },
                        HttpStatus.INTERNAL_SERVER_ERROR,
                    );
                }

                const res = schema.safeParse(data);

                if (!res.success) {
                    const details = res.error.issues.map((issue) => ({
                        field: issue.path.join('.'),
                        message: issue.message,
                        code: issue.code,
                        ...(this.isDev
                            ? { received_value: this.getReceivedValue(data, issue.path) }
                            : {}),
                    }));

                    throw new BaseException(
                        {
                            code: 'RESPONSE_VALIDATION_FAILED',
                            message: 'The response data does not match the expected format',
                            details,
                        },
                        HttpStatus.INTERNAL_SERVER_ERROR,
                    );
                }

                return res.data;
            }),
        );
    }

    private getReceivedValue(data: unknown, path: readonly (string | number | symbol)[]): unknown {
        return path.reduce<unknown>((acc, key) => {
            if (acc === null || acc === undefined) {
                return;
            }
            return (acc as Record<PropertyKey, unknown>)[key];
        }, data);
    }
}
