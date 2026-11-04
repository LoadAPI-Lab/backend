import { applyDecorators, HttpStatus, SetMetadata } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiErrorResponse } from '@shared/error';
import { ZOD_RESPONSE_TOKEN } from '@shared/interceptors';

import { CurrentUserResponseDto } from '../../../application/dtos';
import { UserErrorCodes, UserErrorMessages } from '../../../domain/errors';

export const GetCurrentUserSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Get the current user',
            description: 'Returns the profile of the signed-in user.',
        }),
        ApiResponse({
            status: HttpStatus.OK,
            description: 'The current user',
            type: CurrentUserResponseDto,
        }),
        ApiErrorResponse(
            HttpStatus.NOT_FOUND,
            UserErrorCodes.NOT_FOUND,
            UserErrorMessages[UserErrorCodes.NOT_FOUND],
        ),
        SetMetadata(ZOD_RESPONSE_TOKEN, CurrentUserResponseDto),
    );
