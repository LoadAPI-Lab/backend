import { REDIS_CLIENT } from '@libs/redis';
import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';

import type { TestRunStopper } from '../../domain/ports';
import {
    STOP_CHANNEL_PREFIX,
    STOP_MESSAGE,
    STOPPED_FLAG_TTL_SECONDS,
    STOPPED_FLAG_VALUE,
    STOPPED_KEY_PREFIX,
} from './constants';

@Injectable()
export class TestRunStopperImpl implements TestRunStopper {
    constructor(
        @Inject(REDIS_CLIENT)
        private readonly client: Redis,
    ) {}

    async requestStop(testId: string): Promise<void> {
        await this.client.set(
            `${STOPPED_KEY_PREFIX}${testId}`,
            STOPPED_FLAG_VALUE,
            'EX',
            STOPPED_FLAG_TTL_SECONDS,
        );
        await this.client.publish(`${STOP_CHANNEL_PREFIX}${testId}`, STOP_MESSAGE);
    }
}
