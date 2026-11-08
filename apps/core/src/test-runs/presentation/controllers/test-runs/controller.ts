import {
    Body,
    Get,
    HttpCode,
    HttpStatus,
    type MessageEvent,
    Param,
    Post,
    Query,
    Sse,
    UseGuards,
} from '@nestjs/common';
import { ApiBaseController, CurrentUser, SkipContract } from '@shared/decorators';
import type { AuthenticatedUser } from '@shared/types';
import { map, type Observable } from 'rxjs';

import {
    type ListTestRunsResponse,
    ListTestRunsQueryDto,
    StartTestRunDto,
    type StartTestRunResponse,
    type StopTestRunResponse,
    TestRunParamsDto,
    type TestRunResponse,
} from '../../../application/dtos';
import {
    GetTestRunUseCase,
    ListTestRunsUseCase,
    RerunTestRunUseCase,
    StartTestRunUseCase,
    StopTestRunUseCase,
    WatchTestRunUseCase,
} from '../../../application/use-cases';
import { TestRunExistsGuard } from '../../guards';
import {
    GetTestRunSwagger,
    ListTestRunsSwagger,
    RerunTestRunSwagger,
    StartTestRunSwagger,
    StopTestRunSwagger,
    WatchTestRunSwagger,
} from './swagger';

@ApiBaseController('test-runs', 'Test runs')
export class TestRunsController {
    constructor(
        private readonly startTestRun: StartTestRunUseCase,
        private readonly getTestRun: GetTestRunUseCase,
        private readonly listTestRuns: ListTestRunsUseCase,
        private readonly stopTestRun: StopTestRunUseCase,
        private readonly watchTestRun: WatchTestRunUseCase,
        private readonly rerunTestRun: RerunTestRunUseCase,
    ) {}

    @Post()
    @StartTestRunSwagger()
    start(
        @Body() dto: StartTestRunDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<StartTestRunResponse> {
        return this.startTestRun.execute(dto, user.id);
    }

    @Get()
    @ListTestRunsSwagger()
    list(
        @Query() query: ListTestRunsQueryDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<ListTestRunsResponse> {
        return this.listTestRuns.execute(query, user.id);
    }

    @Get(':id')
    @GetTestRunSwagger()
    get(
        @Param() params: TestRunParamsDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<TestRunResponse> {
        return this.getTestRun.execute(params.id, user.id);
    }

    @Post(':id/rerun')
    @RerunTestRunSwagger()
    rerun(
        @Param() params: TestRunParamsDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<StartTestRunResponse> {
        return this.rerunTestRun.execute(params.id, user.id);
    }

    @Post(':id/stop')
    @HttpCode(HttpStatus.ACCEPTED)
    @StopTestRunSwagger()
    stop(
        @Param() params: TestRunParamsDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<StopTestRunResponse> {
        return this.stopTestRun.execute(params.id, user.id);
    }

    @Sse(':id/metrics')
    @UseGuards(TestRunExistsGuard)
    @SkipContract()
    @WatchTestRunSwagger()
    async watch(
        @Param() params: TestRunParamsDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<Observable<MessageEvent>> {
        const events = await this.watchTestRun.execute(params.id, user.id);

        return events.pipe(map(({ type, data }) => ({ type, data: data as object })));
    }
}
