import { Module } from '@nestjs/common';

import {
    CreateUserUseCase,
    FindUserByEmailQuery,
    GetUserByIdQuery,
    USE_CASES,
} from './application/use-cases';
import { REPOSITORIES } from './infrastructure/persistence/repository';
import { CONTROLLERS } from './presentation/controllers';

@Module({
    controllers: [...CONTROLLERS],
    providers: [...USE_CASES, ...REPOSITORIES],
    exports: [GetUserByIdQuery, FindUserByEmailQuery, CreateUserUseCase],
})
export class UsersModule {}
