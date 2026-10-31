import { Body, Post } from '@nestjs/common';
import { ApiBaseController } from '@shared/decorators';

import { StartTestRunDto, type StartTestRunResponse } from '../../../application/dtos';
import { StartTestRunUseCase } from '../../../application/use-cases';
import { StartTestRunSwagger } from './swagger';

@ApiBaseController('test-runs', 'Test runs')
export class TestRunsController {
    constructor(private readonly startTestRun: StartTestRunUseCase) {}

    @Post()
    @StartTestRunSwagger()
    start(@Body() dto: StartTestRunDto): Promise<StartTestRunResponse> {
        return this.startTestRun.execute(dto);
    }
}
