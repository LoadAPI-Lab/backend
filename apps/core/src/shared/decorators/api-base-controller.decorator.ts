import { applyDecorators, Controller, HttpStatus } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
    ACCESS_TOKEN_COOKIE,
    UNAUTHENTICATED_ERROR_CODE,
    UNAUTHENTICATED_ERROR_MESSAGE,
} from '@shared/constants';
import { ApiErrorResponse, ErrorCode } from '@shared/error';

export const ApiBaseController = (path: string, tag: string) =>
    applyDecorators(
        ApiTags(tag),
        Controller(path),
        ApiCookieAuth(ACCESS_TOKEN_COOKIE),
        ApiErrorResponse(
            HttpStatus.UNAUTHORIZED,
            UNAUTHENTICATED_ERROR_CODE,
            UNAUTHENTICATED_ERROR_MESSAGE,
        ),
        ApiErrorResponse(
            HttpStatus.INTERNAL_SERVER_ERROR,
            ErrorCode.INTERNAL_SERVER_ERROR,
            'A critical server-side error occurred',
        ),
    );
