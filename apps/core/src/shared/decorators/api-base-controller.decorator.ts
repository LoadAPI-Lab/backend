import { applyDecorators, Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiErrorResponse } from '@shared/error';

export const ApiBaseController = (path: string, tag: string, hasJWTGuard = false) => {
    void hasJWTGuard;

    return applyDecorators(
        ApiTags(tag),
        Controller(path),
        ApiErrorResponse(500, 'INTERNAL_SERVER_ERROR', 'A critical server-side error occurred'),
    );
};
