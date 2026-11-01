import { Body, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBaseController } from '@shared/decorators';

import {
    StartTestRunDto,
    type StartTestRunResponse,
    type StopTestRunResponse,
    TestRunParamsDto,
    type TestRunResponse,
} from '../../../application/dtos';
import {
    GetTestRunUseCase,
    StartTestRunUseCase,
    StopTestRunUseCase,
} from '../../../application/use-cases';
import { GetTestRunSwagger, StartTestRunSwagger, StopTestRunSwagger } from './swagger';

@ApiBaseController('test-runs', 'Test runs')
export class TestRunsController {
    constructor(
        private readonly startTestRun: StartTestRunUseCase,
        private readonly getTestRun: GetTestRunUseCase,
        private readonly stopTestRun: StopTestRunUseCase,
    ) {}

    @Post()
    @StartTestRunSwagger()
    start(@Body() dto: StartTestRunDto): Promise<StartTestRunResponse> {
        return this.startTestRun.execute(dto);
    }

    @Get(':id')
    @GetTestRunSwagger()
    get(@Param() params: TestRunParamsDto): Promise<TestRunResponse> {
        return this.getTestRun.execute(params.id);
    }

    @Post(':id/stop')
    @HttpCode(HttpStatus.ACCEPTED)
    @StopTestRunSwagger()
    stop(@Param() params: TestRunParamsDto): Promise<StopTestRunResponse> {
        return this.stopTestRun.execute(params.id);
    }
}
