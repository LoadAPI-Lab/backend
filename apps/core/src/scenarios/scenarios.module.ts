import { Module } from '@nestjs/common';

import { REPOSITORIES } from './infrastructure/persistence/repository';

@Module({
    providers: [...REPOSITORIES],
})
export class ScenariosModule {}
