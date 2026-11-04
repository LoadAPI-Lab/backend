import { Module } from '@nestjs/common';

import { USE_CASES } from './application/use-cases';
import { MESSAGING_PROVIDERS } from './infrastructure/messaging';
import { REPOSITORIES } from './infrastructure/persistence/repository';
import { REDIS_PROVIDERS } from './infrastructure/redis';
import { CONSUMERS } from './presentation/consumers';
import { CONTROLLERS } from './presentation/controllers';
import { SCHEDULERS } from './presentation/schedulers';

@Module({
    controllers: [...CONTROLLERS],
    providers: [
        ...USE_CASES,
        ...REPOSITORIES,
        ...MESSAGING_PROVIDERS,
        ...REDIS_PROVIDERS,
        ...CONSUMERS,
        ...SCHEDULERS,
    ],
})
export class TestRunsModule {}
