import { Module } from '@nestjs/common';

import {
    ExpireStaleTestRunsUseCase,
    GetTestRunUseCase,
    HandleWorkerEventUseCase,
    ListTestRunsUseCase,
    StartTestRunUseCase,
    StopTestRunUseCase,
    WatchTestRunUseCase,
} from './application/use-cases';
import { LiveFeed, TestRunStopper, WorkerOrchestrator } from './domain/ports';
import { TestRunsRepository } from './domain/repositories';
import { WorkerOrchestratorImpl } from './infrastructure/messaging';
import { TestRunsRepositoryImpl } from './infrastructure/persistence/repository';
import { LiveFeedImpl, TestRunStopperImpl } from './infrastructure/redis';
import { WorkerEventsConsumer } from './presentation/consumers';
import { TestRunsController } from './presentation/controllers';
import { WatchdogScheduler } from './presentation/schedulers';

@Module({
    controllers: [TestRunsController],
    providers: [
        StartTestRunUseCase,
        GetTestRunUseCase,
        ListTestRunsUseCase,
        StopTestRunUseCase,
        WatchTestRunUseCase,
        HandleWorkerEventUseCase,
        ExpireStaleTestRunsUseCase,
        WorkerEventsConsumer,
        WatchdogScheduler,
        { provide: TestRunsRepository, useClass: TestRunsRepositoryImpl },
        { provide: WorkerOrchestrator, useClass: WorkerOrchestratorImpl },
        { provide: TestRunStopper, useClass: TestRunStopperImpl },
        { provide: LiveFeed, useClass: LiveFeedImpl },
    ],
    exports: [TestRunsRepository],
})
export class TestRunsModule {}
