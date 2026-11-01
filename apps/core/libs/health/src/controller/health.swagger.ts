import { applyDecorators, HttpStatus, SetMetadata } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiServiceUnavailable } from '@shared/error';
import { ZOD_RESPONSE_TOKEN } from '@shared/interceptors';

import { HealthResponse } from '../dtos';
import { HealthErrorCodes, HealthErrorMessages } from '../errors';

export const GetHealthSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Check service health',
            description: 'Returns healthy when every dependency of the service answers.',
        }),
        ApiResponse({
            status: HttpStatus.OK,
            description: 'The service is healthy',
            type: HealthResponse,
        }),
        ApiServiceUnavailable(HealthErrorMessages[HealthErrorCodes.SERVICE_UNHEALTHY]),
        SetMetadata(ZOD_RESPONSE_TOKEN, HealthResponse),
    );
