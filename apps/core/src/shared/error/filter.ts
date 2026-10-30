import {
    type ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DrizzleQueryError } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodValidationException } from 'nestjs-zod';
import { PostgresError } from 'postgres';
import type { ZodError } from 'zod/v4';

import { DATABASE_ERRORS } from './database-errors';
import { BaseException, type IErrorOptions } from './exception';
import type { ErrorDetail } from './schema';

const SERVICE_NAME = 'core';
const DEFAULT_DATABASE_ERROR_MESSAGE = 'Database operation failed';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);
    private readonly isDev: boolean;

    constructor(private readonly configService: ConfigService) {
        this.isDev = this.configService.get('NODE_ENV') === 'development';
    }

    catch(exception: unknown, host: ArgumentsHost) {
        if (exception instanceof ZodValidationException) {
            return this.parseZodValidation(exception, host);
        }

        if (exception instanceof BaseException) {
            return this.parseHttp(exception, host);
        }

        if (exception instanceof HttpException) {
            return this.parseNestHttp(exception, host);
        }

        if (exception instanceof DrizzleQueryError || exception instanceof PostgresError) {
            return this.parseDatabaseError(exception, host);
        }

        return this.handleUnknownError(exception, host);
    }

    private readonly parseZodValidation = (
        exception: ZodValidationException,
        host: ArgumentsHost,
    ) => {
        const { request, response } = this.getCtxBase(host);
        const status = exception.getStatus();

        const zodError = exception.getZodError() as ZodError;
        const details = this.toErrorDetails(zodError);

        this.log(host, status, {
            message: `Validation failed for ${request.method} ${this.pathOf(request)}`,
            issueCount: details.length,
            ...(this.isDev ? { body: request.body } : {}),
        });

        return response.status(status).send(
            this.formatErrorResponse(request, status, {
                code: 'VALIDATION_FAILED',
                message: 'The request data failed validation',
                details,
                stack: exception.stack,
            }),
        );
    };

    private readonly parseDatabaseError = (
        exception: DrizzleQueryError | PostgresError,
        host: ArgumentsHost,
    ) => {
        const { request, response } = this.getCtxBase(host);

        const pgError =
            exception instanceof PostgresError
                ? exception
                : (exception.cause instanceof PostgresError
                  ? exception.cause
                  : undefined);
        const query = exception instanceof DrizzleQueryError ? exception.query : undefined;
        const params = exception instanceof DrizzleQueryError ? exception.params : undefined;

        const mapping = pgError ? DATABASE_ERRORS[pgError.code] : undefined;
        const status = mapping?.code ?? HttpStatus.INTERNAL_SERVER_ERROR;
        const message = mapping?.msg ?? DEFAULT_DATABASE_ERROR_MESSAGE;

        this.log(host, status, {
            message: `Database error on ${request.method} ${this.pathOf(request)}`,
            ...this.pgLogFields(pgError),
            ...(this.isDev ? { query, params } : {}),
        });

        return response.status(status).send(
            this.formatErrorResponse(request, status, {
                code: 'DATABASE_ERROR',
                message,
                details: [],
                stack: undefined,
            }),
        );
    };

    private readonly parseHttp = (exception: BaseException, host: ArgumentsHost) => {
        const { request, response } = this.getCtxBase(host);
        const status = exception.getStatus();
        const error = exception.getResponse() as IErrorOptions;
        const {cause} = exception;

        this.log(host, status, {
            message: `Business exception on ${request.method} ${this.pathOf(request)}: ${error.code}`,
            errorCode: error.code,
            ...(this.isDev ? { cause } : this.causeLogFields(cause)),
        });

        return response.status(status).send(
            this.formatErrorResponse(request, status, {
                code: error.code,
                message: error.message || exception.message,
                details: this.isDev ? (error.details ?? []) : [],
                stack: exception.stack,
            }),
        );
    };

    private readonly parseNestHttp = (exception: HttpException, host: ArgumentsHost) => {
        const { request, response } = this.getCtxBase(host);
        const status = exception.getStatus();
        const res = exception.getResponse();

        const message =
            typeof res === 'object' && res !== null && 'message' in res
                ? String(res.message)
                : exception.message;

        const errorCode =
            typeof res === 'object' && res !== null && 'error' in res && res.error
                ? String(res.error)
                : null;
        const code = errorCode ? errorCode.toUpperCase().replace(/\s+/g, '_') : 'HTTP_EXCEPTION';

        this.log(host, status, {
            message: `HTTP exception on ${request.method} ${this.pathOf(request)}: ${code}`,
        });

        return response.status(status).send(
            this.formatErrorResponse(request, status, {
                code,
                message,
                stack: exception.stack,
                details: [],
            }),
        );
    };

    private handleUnknownError(exception: unknown, host: ArgumentsHost) {
        const { request, response } = this.getCtxBase(host);
        const status = HttpStatus.INTERNAL_SERVER_ERROR;

        this.log(host, status, {
            message: `Unknown error on ${request.method} ${this.pathOf(request)}`,
            ...(exception instanceof Error
                ? { causeName: exception.name, causeMessage: exception.message }
                : {}),
        });

        const stack = exception instanceof Error ? exception.stack : undefined;

        return response.status(status).send(
            this.formatErrorResponse(request, status, {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred on the server',
                details: [],
                stack,
            }),
        );
    }

    private pgLogFields(pgError: PostgresError | undefined): Record<string, unknown> {
        if (!pgError) {
            return {};
        }

        return {
            dbCode: pgError.code,
            dbTable: pgError.table_name,
            dbConstraint: pgError.constraint_name,
            dbMessage: pgError.message,
        };
    }

    private causeLogFields(cause: unknown): Record<string, unknown> {
        if (cause instanceof PostgresError) {
            return this.pgLogFields(cause);
        }

        if (cause instanceof DrizzleQueryError) {
            const pgCause = cause.cause instanceof PostgresError ? cause.cause : undefined;
            return this.pgLogFields(pgCause);
        }

        if (cause instanceof Error) {
            return { causeName: cause.name, causeMessage: cause.message };
        }

        return {};
    }

    private toErrorDetails(zodError: ZodError): ErrorDetail[] {
        return zodError.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
        }));
    }

    private formatErrorResponse(
        request: FastifyRequest,
        status: number,
        data: {
            code: string;
            message: string;
            details: Record<string, unknown>[] | undefined | null;
            stack?: string;
        },
    ) {
        const requestId = request.id ?? request.headers['x-request-id'];

        return {
            success: false,
            error: {
                code: data.code,
                message: data.message,
                retryable: status >= 500,
            },
            details: data.details,
            meta: {
                service: SERVICE_NAME,
                request: {
                    requestId,
                    path: request.url,
                    method: request.method,
                    ip: request.ip,
                },
                timestamp: new Date().toISOString(),
                ...(this.isDev &&
                    data.stack && {
                        debug: {
                            stack: data.stack,
                        },
                    }),
            },
        };
    }

    private getCtxBase(host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        return {
            response: ctx.getResponse<FastifyReply>(),
            request: ctx.getRequest<FastifyRequest>(),
        };
    }

    private pathOf(request: FastifyRequest): string {
        return request.url.split('?')[0] ?? request.url;
    }

    private log(host: ArgumentsHost, status: number, data: Record<string, unknown>) {
        const { request } = this.getCtxBase(host);

        const payload = {
            requestId: request.id ?? request.headers['x-request-id'] ?? 'unknown',
            method: request.method,
            path: this.pathOf(request),
            statusCode: status,
            ip: request.ip,
            ...data,
        };

        if (status >= 500) {
            this.logger.error(payload);
        } else {
            this.logger.warn(payload);
        }
    }
}
