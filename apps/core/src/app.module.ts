import { ConfigModule, NodeEnv } from '@libs/config';
import { DatabaseHealthService, DatabaseModule } from '@libs/database';
import { HealthModule } from '@libs/health';
import { AMQP_CONNECTION, RabbitMqModule } from '@libs/rabbitmq';
import { REDIS_CLIENT, RedisModule } from '@libs/redis';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import * as schema from '@shared/entities';
import { GlobalExceptionFilter } from '@shared/error';
import { ZodValidationInterceptor } from '@shared/interceptors';
import type { AmqpConnectionManager } from 'amqp-connection-manager';
import type { Redis } from 'ioredis';
import { ZodValidationPipe } from 'nestjs-zod';

import { version } from '../package.json';
import { TestRunsModule } from './test-runs/test-runs.module';

@Module({
    imports: [
        ConfigModule.forRoot(),
        DatabaseModule.registerAsync({
            global: true,
            inject: [ConfigService],
            useFactory: (cfg: ConfigService) => ({
                schema,
                logging: cfg.get('NODE_ENV') !== NodeEnv.PRODUCTION,
            }),
        }),
        RabbitMqModule,
        RedisModule,
        HealthModule.registerAsync({
            inject: [DatabaseHealthService, REDIS_CLIENT, AMQP_CONNECTION],
            useFactory: (
                databaseHealth: DatabaseHealthService,
                redis: Redis,
                connection: AmqpConnectionManager,
            ) => ({
                serviceName: 'core',
                version,
                indicators: {
                    database: () => databaseHealth.isAlive(),
                    redis: async () => (await redis.ping()) === 'PONG',
                    rabbitmq: () => connection.isConnected(),
                },
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
