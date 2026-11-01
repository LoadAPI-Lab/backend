import {
    Body,
    Get,
    HttpCode,
    HttpStatus,
    type MessageEvent,
    Param,
    Post,
    Sse,
    UseGuards,
} from '@nestjs/common';
import { ApiBaseController, SkipContract } from '@shared/decorators';
import { map, type Observable } from 'rxjs';

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
    WatchTestRunUseCase,
} from '../../../application/use-cases';
import { TestRunExistsGuard } from '../../guards';
import {
    GetTestRunSwagger,
    StartTestRunSwagger,
    StopTestRunSwagger,
    WatchTestRunSwagger,
} from './swagger';

@ApiBaseController('test-runs', 'Test runs')
export class TestRunsController {
    constructor(
        private readonly startTestRun: StartTestRunUseCase,
        private readonly getTestRun: GetTestRunUseCase,
        private readonly stopTestRun: StopTestRunUseCase,
        private readonly watchTestRun: WatchTestRunUseCase,
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

    @Sse(':id/metrics')
    @UseGuards(TestRunExistsGuard)
    @SkipContract()
    @WatchTestRunSwagger()
    async watch(@Param() params: TestRunParamsDto): Promise<Observable<MessageEvent>> {
        const events = await this.watchTestRun.execute(params.id);

        return events.pipe(map(({ type, data }) => ({ type, data: data as object })));
    }
}
