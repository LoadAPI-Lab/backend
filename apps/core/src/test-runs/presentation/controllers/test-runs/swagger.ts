import { applyDecorators, HttpStatus, SetMetadata } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiProduces, ApiResponse } from '@nestjs/swagger';
import {
    ApiConflict,
    ApiErrorResponse,
    ApiNotFound,
    ApiServiceUnavailable,
    ApiValidationError,
} from '@shared/error';
import { ZOD_RESPONSE_TOKEN } from '@shared/interceptors';

import {
    ListTestRunsResponseDto,
    StartTestRunDto,
    StartTestRunResponseDto,
    StopTestRunResponseDto,
    TestRunResponseDto,
} from '../../../application/dtos';
import { TestRunErrorCodes, TestRunErrorMessages } from '../../../domain/errors';

export const START_TEST_RUN_HTTP_STATUS = HttpStatus.CREATED;

const ApiDuplicateActiveRun = () =>
    ApiErrorResponse(
        HttpStatus.CONFLICT,
        TestRunErrorCodes.DUPLICATE_ACTIVE,
        TestRunErrorMessages[TestRunErrorCodes.DUPLICATE_ACTIVE],
    );

export const StartTestRunSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Start a test run',
            description:
                'Validates the config, rejects it when an identical run of the user is PENDING or RUNNING, stores a PENDING run and enqueues the job.',
        }),
        ApiBody({ type: StartTestRunDto }),
        ApiResponse({
            status: START_TEST_RUN_HTTP_STATUS,
            description: 'The test run was created and enqueued',
            type: StartTestRunResponseDto,
        }),
        ApiValidationError(),
        ApiDuplicateActiveRun(),
        ApiServiceUnavailable(
            'Too many test runs are in progress, or the test job could not be enqueued',
        ),
        SetMetadata(ZOD_RESPONSE_TOKEN, StartTestRunResponseDto),
    );

export const RerunTestRunSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Re-run a test run',
            description:
                'Starts a new run with the stored config of the given run, whatever its status. Rejects it when an identical run of the user is PENDING or RUNNING, otherwise stores a PENDING run and enqueues the job.',
        }),
        ApiResponse({
            status: START_TEST_RUN_HTTP_STATUS,
            description: 'The new test run was created and enqueued',
            type: StartTestRunResponseDto,
        }),
        ApiValidationError(),
        ApiNotFound('Test run not found'),
        ApiDuplicateActiveRun(),
        ApiServiceUnavailable(
            'Too many test runs are in progress, or the test job could not be enqueued',
        ),
        SetMetadata(ZOD_RESPONSE_TOKEN, StartTestRunResponseDto),
    );

export const GetTestRunSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Get a test run',
            description:
                'Returns the run details: status, timestamps, failure reason, the stored config and the typed final result whose shape follows the run type. Secret header values and URL query parameter values are masked in the config and in the result URLs.',
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

export const ListTestRunsSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'List test runs',
            description:
                'Returns the run history, newest first, with cursor pagination. Each item is a short row: status, timestamps and failure reason; single runs add the tested request, targetRps, durationSeconds and the response time p95Ms; scenario runs add stepsCount and okCount. Secret URL query parameter values are masked. Configs and results are never included: load them with GET /v1/test-runs/:id.',
        }),
        ApiResponse({
            status: HttpStatus.OK,
            description: 'A page of test runs',
            type: ListTestRunsResponseDto,
        }),
        ApiValidationError(),
        SetMetadata(ZOD_RESPONSE_TOKEN, ListTestRunsResponseDto),
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

export const WatchTestRunSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Stream live metrics of a test run',
            description:
                "Server-sent events. 'status' carries { status, reason? }: the current status right after connecting, then every change. 'snapshot' carries the per-second metrics of the run. The stream closes when the run reaches a final status.",
        }),
        ApiProduces('text/event-stream'),
        ApiValidationError(),
        ApiNotFound('Test run not found'),
    );
