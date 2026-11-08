import { users } from '@core/users/infrastructure/persistence/models';
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { ScenarioConfig, SingleConfig } from '../../../domain/schemas';
import { testRunStatusEnum, testTypeEnum } from './enums';

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
    ],
);
