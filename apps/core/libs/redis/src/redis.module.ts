import { Global, Inject, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

import { REDIS_CLIENT, REDIS_SUBSCRIBER } from './constants';

const createConnection = (configService: ConfigService, name: string): Redis => {
    const logger = new Logger(name);
    const connection = new Redis(configService.getOrThrow('REDIS_URL'));

    connection.on('connect', () => logger.log('Connected to Redis'));
    connection.on('error', (error: Error) =>
        logger.error(`Redis connection error: ${error.message}`),
    );

    return connection;
};

@Global()
@Module({
    exports: [REDIS_CLIENT, REDIS_SUBSCRIBER],
    providers: [
        {
            provide: REDIS_CLIENT,
            inject: [ConfigService],
            useFactory: (configService: ConfigService) =>
                createConnection(configService, 'RedisClient'),
        },
        {
            provide: REDIS_SUBSCRIBER,
            inject: [ConfigService],
            useFactory: (configService: ConfigService) =>
                createConnection(configService, 'RedisSubscriber'),
        },
    ],
})
export class RedisModule implements OnApplicationShutdown {
    private readonly logger = new Logger(RedisModule.name);

    constructor(
        @Inject(REDIS_CLIENT)
        private readonly client: Redis,
        @Inject(REDIS_SUBSCRIBER)
        private readonly subscriber: Redis,
    ) {}

    async onApplicationShutdown() {
        this.logger.log('Closing Redis connections...');
        await Promise.allSettled([this.client.quit(), this.subscriber.quit()]);
    }
}
