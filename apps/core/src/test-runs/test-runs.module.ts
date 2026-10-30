import { Module } from '@nestjs/common';

import { TestRunsRepository } from './domain/repositories';
import { TestRunsRepositoryImpl } from './infrastructure/persistence/repository';

@Module({
    providers: [{ provide: TestRunsRepository, useClass: TestRunsRepositoryImpl }],
    exports: [TestRunsRepository],
})
export class TestRunsModule {}
