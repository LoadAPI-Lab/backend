import { Module } from '@nestjs/common';

import { USE_CASES } from './application/use-cases';
import { HTTP_PROVIDERS } from './infrastructure/http';
import { CONTROLLERS } from './presentation/controllers';

@Module({
    controllers: [...CONTROLLERS],
    providers: [...USE_CASES, ...HTTP_PROVIDERS],
})
export class RequestsModule {}
