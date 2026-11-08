import { applyDecorators, HttpStatus, SetMetadata } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiErrorResponse, ApiValidationError, ErrorCode } from '@shared/error';
import { ZOD_RESPONSE_TOKEN } from '@shared/interceptors';

import {
    ApiSpecListResponseDto,
    ApiSpecResponseDto,
    ApiSpecSummaryResponseDto,
    ImportApiSpecDto,
    RenameApiSpecDto,
    UpdateApiSpecContentDto,
    UpdatedApiSpecResponseDto,
} from '../../../application/dtos';
import { ApiSpecErrorCodes, ApiSpecErrorMessages } from '../../../domain/errors';

const errorLine = (code: string, message: string): string => `${code}: ${message}.`;

const IMPORT_BAD_REQUEST_DESCRIPTION = [
    errorLine(ErrorCode.VALIDATION_FAILED, 'the request body failed validation'),
    errorLine(
        ApiSpecErrorCodes.INVALID_SYNTAX,
        `${ApiSpecErrorMessages[ApiSpecErrorCodes.INVALID_SYNTAX]}, one detail with line and column`,
    ),
    errorLine(
        ApiSpecErrorCodes.UNSUPPORTED_VERSION,
        ApiSpecErrorMessages[ApiSpecErrorCodes.UNSUPPORTED_VERSION],
    ),
    errorLine(
        ApiSpecErrorCodes.INVALID,
        `${ApiSpecErrorMessages[ApiSpecErrorCodes.INVALID]}, one detail per problem with a dot path; external $ref values are rejected`,
    ),
].join(' ');

const IMPORT_TOO_LARGE_DESCRIPTION = [
    errorLine(ApiSpecErrorCodes.TOO_LARGE, ApiSpecErrorMessages[ApiSpecErrorCodes.TOO_LARGE]),
    'Request bodies above 6 MiB are rejected before parsing with status 413 and code HTTP_EXCEPTION.',
].join(' ');

const ApiSpecNotFound = () =>
    ApiErrorResponse(
        HttpStatus.NOT_FOUND,
        ApiSpecErrorCodes.NOT_FOUND,
        `${errorLine(ApiSpecErrorCodes.NOT_FOUND, ApiSpecErrorMessages[ApiSpecErrorCodes.NOT_FOUND])} Also returned for specs of other users.`,
    );

const ApiSpecDocumentInvalid = () =>
    ApiErrorResponse(
        HttpStatus.BAD_REQUEST,
        ApiSpecErrorCodes.INVALID_SYNTAX,
        IMPORT_BAD_REQUEST_DESCRIPTION,
        [
            {
                field: 'content',
                message: 'Nested mappings are not allowed in compact mappings',
                code: 'yaml_syntax',
                line: 3,
                column: 10,
            },
        ],
    );

const ApiSpecDocumentTooLarge = () =>
    ApiErrorResponse(
        HttpStatus.PAYLOAD_TOO_LARGE,
        ApiSpecErrorCodes.TOO_LARGE,
        IMPORT_TOO_LARGE_DESCRIPTION,
    );

export const ImportApiSpecSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Import an OpenAPI document',
            description:
                'Validates an OpenAPI 3.0 or 3.1 document given as YAML or JSON text, resolves internal $ref values, normalizes it into servers and endpoints and stores it for the current user. External references are never resolved. The source text is never returned.',
        }),
        ApiBody({ type: ImportApiSpecDto }),
        ApiResponse({
            status: HttpStatus.CREATED,
            description: 'The spec was imported',
            type: ApiSpecResponseDto,
        }),
        ApiSpecDocumentInvalid(),
        ApiSpecDocumentTooLarge(),
        SetMetadata(ZOD_RESPONSE_TOKEN, ApiSpecResponseDto),
    );

export const ListApiSpecsSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'List API specs',
            description:
                'Returns summaries of the specs of the current user, newest first, without pagination.',
        }),
        ApiResponse({
            status: HttpStatus.OK,
            description: 'The spec summaries',
            type: ApiSpecListResponseDto,
        }),
        SetMetadata(ZOD_RESPONSE_TOKEN, ApiSpecListResponseDto),
    );

export const GetApiSpecSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Get an API spec',
            description:
                'Returns the normalized spec with servers and endpoints. The source text is never included.',
        }),
        ApiResponse({
            status: HttpStatus.OK,
            description: 'The spec',
            type: ApiSpecResponseDto,
        }),
        ApiValidationError(),
        ApiSpecNotFound(),
        SetMetadata(ZOD_RESPONSE_TOKEN, ApiSpecResponseDto),
    );

export const RenameApiSpecSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Rename an API spec',
            description: 'Changes the display name and returns the spec summary.',
        }),
        ApiBody({ type: RenameApiSpecDto }),
        ApiResponse({
            status: HttpStatus.OK,
            description: 'The renamed spec',
            type: ApiSpecSummaryResponseDto,
        }),
        ApiValidationError(),
        ApiSpecNotFound(),
        SetMetadata(ZOD_RESPONSE_TOKEN, ApiSpecSummaryResponseDto),
    );

export const UpdateApiSpecContentSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Replace the content of an API spec',
            description:
                'Validates and normalizes a new OpenAPI 3.0 or 3.1 document with the same rules as import and replaces the stored document, servers and endpoints. The id and import time stay the same; the display name changes only when given. On any error nothing is saved and the previous version stays. Returns the spec with a summary of added, changed and removed endpoints; an endpoint counts as changed when its parameters, request body or responses differ. The source text is never returned.',
        }),
        ApiBody({ type: UpdateApiSpecContentDto }),
        ApiResponse({
            status: HttpStatus.OK,
            description: 'The spec content was replaced',
            type: UpdatedApiSpecResponseDto,
        }),
        ApiSpecDocumentInvalid(),
        ApiSpecNotFound(),
        ApiSpecDocumentTooLarge(),
        SetMetadata(ZOD_RESPONSE_TOKEN, UpdatedApiSpecResponseDto),
    );

export const DeleteApiSpecSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Delete an API spec',
            description: 'Deletes the spec of the current user.',
        }),
        ApiResponse({
            status: HttpStatus.NO_CONTENT,
            description: 'The spec was deleted',
        }),
        ApiValidationError(),
        ApiSpecNotFound(),
    );
