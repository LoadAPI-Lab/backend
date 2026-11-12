import { Body, Delete, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { ApiBaseController, CurrentUser, SkipContract } from '@shared/decorators';
import type { AuthenticatedUser } from '@shared/types';

import {
    CreateScenarioDto,
    ReplaceScenarioDto,
    ScenarioParamsDto,
    type ScenarioResponse,
    type ScenarioSummaryResponse,
} from '../../../application/dtos';
import {
    CreateScenarioUseCase,
    DeleteScenarioUseCase,
    GetScenarioUseCase,
    ListScenariosUseCase,
    ReplaceScenarioUseCase,
} from '../../../application/use-cases';
import {
    CreateScenarioSwagger,
    DeleteScenarioSwagger,
    GetScenarioSwagger,
    ListScenariosSwagger,
    ReplaceScenarioSwagger,
} from './swagger';

@ApiBaseController('scenarios', 'Scenarios')
export class ScenariosController {
    constructor(
        private readonly createScenario: CreateScenarioUseCase,
        private readonly listScenarios: ListScenariosUseCase,
        private readonly getScenario: GetScenarioUseCase,
        private readonly replaceScenario: ReplaceScenarioUseCase,
        private readonly deleteScenario: DeleteScenarioUseCase,
    ) {}

    @Post()
    @CreateScenarioSwagger()
    create(
        @Body() dto: CreateScenarioDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<ScenarioResponse> {
        return this.createScenario.execute(dto, user.id);
    }

    @Get()
    @ListScenariosSwagger()
    list(@CurrentUser() user: AuthenticatedUser): Promise<ScenarioSummaryResponse[]> {
        return this.listScenarios.execute(user.id);
    }

    @Get(':id')
    @GetScenarioSwagger()
    get(
        @Param() params: ScenarioParamsDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<ScenarioResponse> {
        return this.getScenario.execute(params.id, user.id);
    }

    @Put(':id')
    @ReplaceScenarioSwagger()
    replace(
        @Param() params: ScenarioParamsDto,
        @Body() dto: ReplaceScenarioDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<ScenarioResponse> {
        return this.replaceScenario.execute(params.id, dto, user.id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @SkipContract()
    @DeleteScenarioSwagger()
    delete(
        @Param() params: ScenarioParamsDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<void> {
        return this.deleteScenario.execute(params.id, user.id);
    }
}
