import { Module } from '@nestjs/common';

import { UsersRepository } from './domain/repositories';
import { UsersRepositoryImpl } from './infrastructure/persistence/repository';

@Module({
    providers: [{ provide: UsersRepository, useClass: UsersRepositoryImpl }],
    exports: [UsersRepository],
})
export class UsersModule {}
