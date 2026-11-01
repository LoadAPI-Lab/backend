import { AMQP_CONNECTION } from '@libs/rabbitmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import type { ConfirmChannel } from 'amqplib';

import type { TestJob, WorkerOrchestrator } from '../../domain/ports';
import { QUEUE_OPTIONS, TEST_JOBS_QUEUE } from './constants';

const PUBLISH_TIMEOUT_MS = 5000;

@Injectable()
export class WorkerOrchestratorImpl implements WorkerOrchestrator {
    private readonly logger = new Logger(WorkerOrchestratorImpl.name);
    private readonly channel: ChannelWrapper;

    constructor(
        @Inject(AMQP_CONNECTION)
        connection: AmqpConnectionManager,
    ) {
        this.channel = connection.createChannel({
            json: true,
            setup: async (channel: ConfirmChannel) => {
                await channel.assertQueue(TEST_JOBS_QUEUE, QUEUE_OPTIONS);
            },
        });

        this.channel.on('error', (error: unknown) => {
            this.logger.error(`Test jobs channel error: ${String(error)}`);
        });
    }

    async enqueue(job: TestJob): Promise<void> {
        await this.channel.sendToQueue(TEST_JOBS_QUEUE, job, {
            persistent: true,
            contentType: 'application/json',
            timeout: PUBLISH_TIMEOUT_MS,
        });
    }
}
