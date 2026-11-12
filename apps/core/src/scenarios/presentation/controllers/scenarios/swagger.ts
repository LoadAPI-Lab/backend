import { applyDecorators, HttpStatus, SetMetadata } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiErrorResponse, ApiValidationError } from '@shared/error';
import { ZOD_RESPONSE_TOKEN } from '@shared/interceptors';

import {
    CreateScenarioDto,
    ReplaceScenarioDto,
    ScenarioListResponseDto,
    ScenarioResponseDto,
} from '../../../application/dtos';
import { ScenarioErrorCodes, ScenarioErrorMessages } from '../../../domain/errors';

const UNMASKED_CONFIG_NOTE =
    'The config is returned unmasked, including header values, so that the owner can edit and save it again.';

const ScenarioNotFound = () =>
    ApiErrorResponse(
        HttpStatus.NOT_FOUND,
        ScenarioErrorCodes.NOT_FOUND,
        `${ScenarioErrorCodes.NOT_FOUND}: ${ScenarioErrorMessages[ScenarioErrorCodes.NOT_FOUND]}. Also returned for scenarios of other users.`,
    );

export const CreateScenarioSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Create a scenario',
            description: `Validates the scenario config with the same rules as starting a scenario test run and stores it for the current user. ${UNMASKED_CONFIG_NOTE} To run a saved scenario, start a test run with type "scenario".`,
        }),
        ApiBody({ type: CreateScenarioDto }),
        ApiResponse({
            status: HttpStatus.CREATED,
            description: 'The scenario was created',
            type: ScenarioResponseDto,
        }),
        ApiValidationError(),
        SetMetadata(ZOD_RESPONSE_TOKEN, ScenarioResponseDto),
    );

export const ListScenariosSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'List scenarios',
            description:
                'Returns summaries of the scenarios of the current user, newest first, without configs and without pagination.',
        }),
        ApiResponse({
            status: HttpStatus.OK,
            description: 'The scenario summaries',
            type: ScenarioListResponseDto,
        }),
        SetMetadata(ZOD_RESPONSE_TOKEN, ScenarioListResponseDto),
    );

export const GetScenarioSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Get a scenario',
            description: `Returns the scenario with its config. ${UNMASKED_CONFIG_NOTE}`,
        }),
        ApiResponse({
            status: HttpStatus.OK,
            description: 'The scenario',
            type: ScenarioResponseDto,
        }),
        ApiValidationError(),
        ScenarioNotFound(),
        SetMetadata(ZOD_RESPONSE_TOKEN, ScenarioResponseDto),
    );

export const ReplaceScenarioSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Replace a scenario',
            description: `Replaces the name and the config of the scenario. The config is validated with the same rules as starting a scenario test run. The id and creation time stay the same. ${UNMASKED_CONFIG_NOTE}`,
        }),
        ApiBody({ type: ReplaceScenarioDto }),
        ApiResponse({
            status: HttpStatus.OK,
            description: 'The scenario was replaced',
            type: ScenarioResponseDto,
        }),
        ApiValidationError(),
        ScenarioNotFound(),
        SetMetadata(ZOD_RESPONSE_TOKEN, ScenarioResponseDto),
    );

export const DeleteScenarioSwagger = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Delete a scenario',
            description: 'Deletes the scenario of the current user.',
        }),
        ApiResponse({
            status: HttpStatus.NO_CONTENT,
            description: 'The scenario was deleted',
        }),
        ApiValidationError(),
        ScenarioNotFound(),
    );
