import type { HttpStatus } from '@nestjs/common';

import { BaseException, type IErrorOptions } from './exception';

export interface ErrorFactoryOptions {
    readonly details?: IErrorOptions['details'];
    readonly cause?: unknown;
}

export type ErrorFactory<Code extends string> = (
    code: Code,
    options?: ErrorFactoryOptions,
) => BaseException;

export const createErrorFactory =
    <Code extends string>(
        messages: Readonly<Record<Code, string>>,
        statuses: Readonly<Record<Code, HttpStatus>>,
    ): ErrorFactory<Code> =>
    (code, options = {}) =>
        new BaseException(
            {
                code,
                message: messages[code],
                ...(options.details !== undefined && { details: options.details }),
            },
            statuses[code],
            options.cause,
        );
