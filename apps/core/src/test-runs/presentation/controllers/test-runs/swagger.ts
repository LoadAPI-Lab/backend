import { applyDecorators, HttpStatus, SetMetadata } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiConflict, ApiNotFound, ApiServiceUnavailable, ApiValidationError } from '@shared/error';
import { ZOD_RESPONSE_TOKEN } from '@shared/interceptors';

import {
    StartTestRunDto,
    StartTestRunResponseDto,
    StopTestRunResponseDto,
    TestRunResponseDto,
} from '../../../application/dtos';

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

export const GetTestRunSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Get a test run',
            description: 'Returns the run status and final result. The config is never included.',
        }),
        ApiResponse({
            status: HttpStatus.OK,
            description: 'The test run',
            type: TestRunResponseDto,
        }),
        ApiValidationError(),
        ApiNotFound('Test run not found'),
        SetMetadata(ZOD_RESPONSE_TOKEN, TestRunResponseDto),
    );

export const StopTestRunSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Stop a test run',
            description:
                'Requests a stop and returns the current status. The status becomes STOPPED once the worker reports the run as finished.',
        }),
        ApiResponse({
            status: HttpStatus.ACCEPTED,
            description: 'The stop was requested',
            type: StopTestRunResponseDto,
        }),
        ApiValidationError(),
        ApiNotFound('Test run not found'),
        ApiConflict('Test run has already finished'),
        SetMetadata(ZOD_RESPONSE_TOKEN, StopTestRunResponseDto),
    );
