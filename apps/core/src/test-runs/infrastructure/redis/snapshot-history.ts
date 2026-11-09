import { REDIS_CLIENT } from '@libs/redis';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';

import type { SnapshotHistory } from '../../domain/ports';
import {
    SNAPSHOT_HISTORY_FIRST_INDEX,
    SNAPSHOT_HISTORY_KEY_PREFIX,
    SNAPSHOT_HISTORY_LAST_INDEX,
} from './constants';

@Injectable()
export class SnapshotHistoryImpl implements SnapshotHistory {
    private readonly logger = new Logger(SnapshotHistoryImpl.name);

    constructor(
        @Inject(REDIS_CLIENT)
        private readonly client: Redis,
    ) {}

    async read(testId: string): Promise<unknown[]> {
        const entries = await this.client.lrange(
            `${SNAPSHOT_HISTORY_KEY_PREFIX}${testId}`,
            SNAPSHOT_HISTORY_FIRST_INDEX,
            SNAPSHOT_HISTORY_LAST_INDEX,
        );

        const snapshots: unknown[] = [];
        for (const entry of entries) {
            try {
                snapshots.push(JSON.parse(entry));
            } catch {
                this.logger.warn(`Dropped a stored snapshot with invalid JSON for test ${testId}`);
            }
        }

        return snapshots;
    }
}
