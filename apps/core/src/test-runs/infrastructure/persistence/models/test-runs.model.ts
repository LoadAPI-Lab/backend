import { users } from '@core/users/infrastructure/persistence/models';
import { inArray } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { ACTIVE_STATUSES } from '../../../domain/constants';
import type { ScenarioConfig, SingleConfig } from '../../../domain/schemas';
import { testRunStatusEnum, testTypeEnum } from './enums';

export const ACTIVE_CONFIG_HASH_UNIQUE_INDEX = 'test_runs_user_active_config_hash_uidx';

export const testRuns = pgTable(
    'test_runs',
    {
        id: uuid().primaryKey(),
        userId: uuid()
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        type: testTypeEnum().notNull(),
        status: testRunStatusEnum().notNull(),
        config: jsonb().$type<SingleConfig | ScenarioConfig>().notNull(),
        configHash: text(),
        reason: text(),
        result: jsonb().$type<unknown>(),
        createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
        startedAt: timestamp({ withTimezone: true }),
        finishedAt: timestamp({ withTimezone: true }),
    },
    (table) => [
        index('test_runs_status_idx').on(table.status),
        index('test_runs_user_created_at_idx').on(
            table.userId,
            table.createdAt.desc(),
            table.id.desc(),
        ),
        uniqueIndex(ACTIVE_CONFIG_HASH_UNIQUE_INDEX)
            .on(table.userId, table.configHash)
            .where(inArray(table.status, ACTIVE_STATUSES).inlineParams()),
    ],
);
