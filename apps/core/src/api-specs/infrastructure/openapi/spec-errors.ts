import type { ErrorDetail } from '@shared/error';

import { ApiSpecErrorCodes, apiSpecException } from '../../domain/errors';

export const INVALID_SPEC_CODE = 'invalid_spec';
export const YAML_SYNTAX_CODE = 'yaml_syntax';
export const CONTENT_FIELD = 'content';

export interface SourcePosition {
    readonly line: number;
    readonly col: number;
}

export const invalidSpec = (details: ErrorDetail[]) =>
    apiSpecException(ApiSpecErrorCodes.INVALID, { details });

export const invalidSpecDetail = (field: string, message: string): ErrorDetail => ({
    field,
    message,
    code: INVALID_SPEC_CODE,
});

export const invalidSyntax = (message: string, position?: SourcePosition) =>
    apiSpecException(ApiSpecErrorCodes.INVALID_SYNTAX, {
        details: [
            {
                field: CONTENT_FIELD,
                message,
                code: YAML_SYNTAX_CODE,
                ...(position && { line: position.line, column: position.col }),
            },
        ],
    });
