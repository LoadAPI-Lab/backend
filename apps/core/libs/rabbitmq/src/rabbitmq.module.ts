import { Global, Inject, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type AmqpConnectionManager, connect } from 'amqp-connection-manager';

import { AMQP_CONNECTION } from './constants';

@Global()
@Module({
    exports: [AMQP_CONNECTION],
    providers: [
        {
            provide: AMQP_CONNECTION,
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const logger = new Logger('RabbitMq');
                const connection = connect(configService.getOrThrow('RABBITMQ_URL'));

                connection.on('connect', () => logger.log('Connected to RabbitMQ'));
                connection.on('disconnect', ({ err }) =>
                    logger.warn(`Disconnected from RabbitMQ: ${err?.message}`),
                );

                return connection;
            },
        },
    ],
})
export class RabbitMqModule implements OnApplicationShutdown {
    private readonly logger = new Logger(RabbitMqModule.name);

    constructor(
        @Inject(AMQP_CONNECTION)
        private readonly connection: AmqpConnectionManager,
    ) {}

    async onApplicationShutdown() {
        this.logger.log('Closing RabbitMQ connection...');
        await this.connection.close();
    }
}
