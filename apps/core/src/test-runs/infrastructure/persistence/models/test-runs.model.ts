import { users } from '@core/users/infrastructure/persistence/models';
import { isNotNull } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { ScenarioConfig, SingleConfig } from '../../../domain/schemas';
import { testRunStatusEnum, testTypeEnum } from './enums';

export const IDEMPOTENCY_KEY_UNIQUE_INDEX = 'test_runs_user_idempotency_key_uidx';

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
        idempotencyKey: text(),
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
        uniqueIndex(IDEMPOTENCY_KEY_UNIQUE_INDEX)
            .on(table.userId, table.idempotencyKey)
            .where(isNotNull(table.idempotencyKey)),
    ],
);
