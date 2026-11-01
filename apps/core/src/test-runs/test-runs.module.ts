import { Module } from '@nestjs/common';

import {
    GetTestRunUseCase,
    HandleWorkerEventUseCase,
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

@Module({
    controllers: [TestRunsController],
    providers: [
        StartTestRunUseCase,
        GetTestRunUseCase,
        StopTestRunUseCase,
        WatchTestRunUseCase,
        HandleWorkerEventUseCase,
        WorkerEventsConsumer,
        { provide: TestRunsRepository, useClass: TestRunsRepositoryImpl },
        { provide: WorkerOrchestrator, useClass: WorkerOrchestratorImpl },
        { provide: TestRunStopper, useClass: TestRunStopperImpl },
        { provide: LiveFeed, useClass: LiveFeedImpl },
    ],
    exports: [TestRunsRepository],
})
export class TestRunsModule {}
