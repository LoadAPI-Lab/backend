import { ConfigModule } from '@libs/config';
import { DatabaseModule } from '@libs/database';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import * as schema from '@shared/entities';
import { GlobalExceptionFilter } from '@shared/error';
import { ZodValidationInterceptor } from '@shared/interceptors';
import { ZodValidationPipe } from 'nestjs-zod';

import { TestRunsModule } from './test-runs/test-runs.module';

@Module({
    imports: [
        ConfigModule,
        DatabaseModule.registerAsync({
            global: true,
            inject: [ConfigService],
            useFactory: (cfg: ConfigService) => ({
                schema,
                logging: cfg.get('NODE_ENV') !== 'production',
            }),
        }),
        TestRunsModule,
    ],
    providers: [
        {
            provide: APP_PIPE,
            useClass: ZodValidationPipe,
        },
        {
            provide: APP_FILTER,
            useClass: GlobalExceptionFilter,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: ZodValidationInterceptor,
        },
    ],
})
export class AppModule {}
