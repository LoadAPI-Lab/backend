import { REDIS_SUBSCRIBER } from '@libs/redis';
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { Observable, Subject } from 'rxjs';

import { LiveEventType, type TestRunStatus } from '../../domain/constants';
import type { LiveEvent, LiveFeed } from '../../domain/ports';
import { isFinalStatus } from '../../domain/test-run';
import { SNAPSHOT_CHANNEL_PATTERN, SNAPSHOT_CHANNEL_PREFIX } from './constants';

const PATTERN_MESSAGE_EVENT = 'pmessage';

@Injectable()
export class LiveFeedImpl implements LiveFeed, OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(LiveFeedImpl.name);
    private readonly streams = new Map<string, Subject<LiveEvent>>();

    constructor(
        @Inject(REDIS_SUBSCRIBER)
        private readonly subscriber: Redis,
    ) {}

    async onModuleInit(): Promise<void> {
        this.subscriber.on(PATTERN_MESSAGE_EVENT, this.handleSnapshot);
        await this.subscriber.psubscribe(SNAPSHOT_CHANNEL_PATTERN);
    }

    async onModuleDestroy(): Promise<void> {
        this.subscriber.off(PATTERN_MESSAGE_EVENT, this.handleSnapshot);

        for (const stream of this.streams.values()) {
            stream.complete();
        }
        this.streams.clear();

        await this.subscriber.punsubscribe(SNAPSHOT_CHANNEL_PATTERN);
    }

    watch(testId: string): Observable<LiveEvent> {
        return new Observable<LiveEvent>((subscriber) => {
            const stream = this.getOrCreateStream(testId);
            const subscription = stream.subscribe(subscriber);

            return () => {
                subscription.unsubscribe();

                if (!stream.observed && this.streams.get(testId) === stream) {
                    this.streams.delete(testId);
                }
            };
        });
    }

    publishStatus(testId: string, status: TestRunStatus, reason?: string): void {
        const stream = this.streams.get(testId);
        if (!stream) {
            return;
        }

        const event: LiveEvent = { type: LiveEventType.STATUS, data: { status, reason } };

        if (isFinalStatus(status)) {
            this.streams.delete(testId);
            stream.next(event);
            stream.complete();
            return;
        }

        stream.next(event);
    }

    private getOrCreateStream(testId: string): Subject<LiveEvent> {
        const existing = this.streams.get(testId);
        if (existing) {
            return existing;
        }

        const stream = new Subject<LiveEvent>();
        this.streams.set(testId, stream);
        return stream;
    }

    private readonly handleSnapshot = (_pattern: string, channel: string, message: string) => {
        const testId = channel.slice(SNAPSHOT_CHANNEL_PREFIX.length);

        let data: unknown;
        try {
            data = JSON.parse(message);
        } catch {
            this.logger.warn(`Dropped a snapshot with invalid JSON for test ${testId}`);
            return;
        }

        this.streams.get(testId)?.next({ type: LiveEventType.SNAPSHOT, data });
    };
}
