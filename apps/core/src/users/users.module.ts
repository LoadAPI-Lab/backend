import { Module } from '@nestjs/common';

import { USE_CASES } from './application/use-cases';
import { UsersRepository } from './domain/repositories';
import { REPOSITORIES } from './infrastructure/persistence/repository';
import { CONTROLLERS } from './presentation/controllers';

@Module({
    controllers: [...CONTROLLERS],
    providers: [...USE_CASES, ...REPOSITORIES],
    exports: [UsersRepository],
})
export class UsersModule {}
