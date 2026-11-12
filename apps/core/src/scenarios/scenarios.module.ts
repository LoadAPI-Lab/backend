import { Module } from '@nestjs/common';

import { USE_CASES } from './application/use-cases';
import { REPOSITORIES } from './infrastructure/persistence/repository';
import { CONTROLLERS } from './presentation/controllers';

@Module({
    controllers: [...CONTROLLERS],
    providers: [...USE_CASES, ...REPOSITORIES],
})
export class ScenariosModule {}
