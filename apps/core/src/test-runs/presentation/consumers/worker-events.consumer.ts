import { setTimeout as delay } from 'node:timers/promises';

import { AMQP_CONNECTION } from '@libs/rabbitmq';
import {
    Inject,
    Injectable,
    Logger,
    type OnApplicationBootstrap,
    type OnModuleDestroy,
} from '@nestjs/common';
import type { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';

import { workerEventSchema, type WorkerEvent } from '../../application/dtos';
import { HandleWorkerEventUseCase, WorkerEventOutcome } from '../../application/use-cases';
import { QUEUE_OPTIONS, TEST_RESULTS_QUEUE } from '../../infrastructure/messaging';

const PREFETCH_COUNT = 10;
const REQUEUE_DELAY_MS = 1000;

type ParsedBody = { event: WorkerEvent } | { rejection: string };

function parseBody(content: Buffer): ParsedBody {
    let body: unknown;
    try {
        body = JSON.parse(content.toString());
    } catch {
        return { rejection: 'body is not valid JSON' };
    }

    const parsed = workerEventSchema.safeParse(body);
    if (!parsed.success) {
        const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.code}`);
        return { rejection: `schema mismatch (${issues.join(', ')})` };
    }

    return { event: parsed.data };
}

function describeError(error: unknown): string {
    if (!(error instanceof Error)) {
        return 'unknown error';
    }

    const { cause } = error;
    const code = cause instanceof Object && 'code' in cause ? String(cause.code) : undefined;
    return code ? `${error.name} (${code})` : error.name;
}

@Injectable()
export class WorkerEventsConsumer implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly logger = new Logger(WorkerEventsConsumer.name);
    private channel?: ChannelWrapper;
    private consumerGeneration = 0;

    constructor(
        @Inject(AMQP_CONNECTION)
        private readonly connection: AmqpConnectionManager,
        private readonly handleWorkerEvent: HandleWorkerEventUseCase,
    ) {}

    onApplicationBootstrap() {
        this.channel = this.connection.createChannel({
            setup: async (channel: ConfirmChannel) => {
                await channel.prefetch(PREFETCH_COUNT);
                await channel.assertQueue(TEST_RESULTS_QUEUE, QUEUE_OPTIONS);

                this.consumerGeneration += 1;
                const generation = this.consumerGeneration;

                await channel.consume(
                    TEST_RESULTS_QUEUE,
                    (message) => {
                        if (message) {
                            this.onMessage(message, generation);
                        } else {
                            this.logger.warn('Test results consumer was cancelled by the broker');
                        }
                    },
                    { noAck: false },
                );
            },
        });

        this.channel.on('error', (error: unknown) => {
            this.logger.error(`Test results channel error: ${describeError(error)}`);
        });
    }

    async onModuleDestroy() {
        await this.channel?.close();
    }

    private onMessage(message: ConsumeMessage, generation: number) {
        this.process(message, generation).catch((error: unknown) => {
            this.logger.error(`Failed to settle a worker event: ${describeError(error)}`);
        });
    }

    private async process(message: ConsumeMessage, generation: number) {
        const parsed = parseBody(message.content);
        if ('rejection' in parsed) {
            this.logger.warn(`Dropped a worker event: ${parsed.rejection}`);
            this.ack(message, generation);
            return;
        }

        const { event } = parsed;
        let outcome: WorkerEventOutcome;
        try {
            outcome = await this.handleWorkerEvent.execute(event);
        } catch (error) {
            this.logger.error(
                `Failed to apply ${event.eventType} of test run ${event.testId}: ${describeError(error)}`,
            );
            await delay(REQUEUE_DELAY_MS);
            this.nackWithRequeue(message, generation);
            return;
        }

        this.logOutcome(event, outcome);
        this.ack(message, generation);
    }

    private logOutcome(event: WorkerEvent, outcome: WorkerEventOutcome) {
        const summary = `testId=${event.testId} eventType=${event.eventType} outcome=${outcome}`;
        if (outcome === WorkerEventOutcome.UNKNOWN_TEST_RUN) {
            this.logger.warn(summary);
        } else {
            this.logger.debug(summary);
        }
    }

    private ack(message: ConsumeMessage, generation: number) {
        if (generation === this.consumerGeneration) {
            this.channel?.ack(message);
        }
    }

    private nackWithRequeue(message: ConsumeMessage, generation: number) {
        if (generation === this.consumerGeneration) {
            this.channel?.nack(message, false, true);
        }
    }
}
