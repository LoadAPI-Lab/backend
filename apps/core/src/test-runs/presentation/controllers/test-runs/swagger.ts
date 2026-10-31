import { applyDecorators, HttpStatus, SetMetadata } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiServiceUnavailable, ApiValidationError } from '@shared/error';
import { ZOD_RESPONSE_TOKEN } from '@shared/interceptors';

import { StartTestRunDto, StartTestRunResponseDto } from '../../../application/dtos';

export const StartTestRunSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Start a test run',
            description: 'Validates the config, stores a PENDING run and enqueues the job.',
        }),
        ApiBody({ type: StartTestRunDto }),
        ApiResponse({
            status: HttpStatus.CREATED,
            description: 'The test run was created and enqueued',
            type: StartTestRunResponseDto,
        }),
        ApiValidationError(),
        ApiServiceUnavailable('Failed to enqueue the test job'),
        SetMetadata(ZOD_RESPONSE_TOKEN, StartTestRunResponseDto),
    );
