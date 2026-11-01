import { Module } from '@nestjs/common';

import { HandleWorkerEventUseCase, StartTestRunUseCase } from './application/use-cases';
import { WorkerOrchestrator } from './domain/ports';
import { TestRunsRepository } from './domain/repositories';
import { WorkerOrchestratorImpl } from './infrastructure/messaging';
import { TestRunsRepositoryImpl } from './infrastructure/persistence/repository';
import { WorkerEventsConsumer } from './presentation/consumers';
import { TestRunsController } from './presentation/controllers';

@Module({
    controllers: [TestRunsController],
    providers: [
        StartTestRunUseCase,
        HandleWorkerEventUseCase,
        WorkerEventsConsumer,
        { provide: TestRunsRepository, useClass: TestRunsRepositoryImpl },
        { provide: WorkerOrchestrator, useClass: WorkerOrchestratorImpl },
    ],
    exports: [TestRunsRepository],
})
export class TestRunsModule {}
