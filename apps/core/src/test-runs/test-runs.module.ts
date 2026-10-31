import { Module } from '@nestjs/common';

import { StartTestRunUseCase } from './application/use-cases';
import { WorkerOrchestrator } from './domain/ports';
import { TestRunsRepository } from './domain/repositories';
import { WorkerOrchestratorImpl } from './infrastructure/messaging';
import { TestRunsRepositoryImpl } from './infrastructure/persistence/repository';
import { TestRunsController } from './presentation/controllers';

@Module({
    controllers: [TestRunsController],
    providers: [
        StartTestRunUseCase,
        { provide: TestRunsRepository, useClass: TestRunsRepositoryImpl },
        { provide: WorkerOrchestrator, useClass: WorkerOrchestratorImpl },
    ],
    exports: [TestRunsRepository],
})
export class TestRunsModule {}
