import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { testRunStatusEnum, testTypeEnum } from './enums';

export const testRuns = pgTable(
    'test_runs',
    {
        id: uuid().primaryKey(),
        type: testTypeEnum().notNull(),
        status: testRunStatusEnum().notNull(),
        config: jsonb().$type<unknown>().notNull(),
        reason: text(),
        result: jsonb().$type<unknown>(),
        createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
        startedAt: timestamp({ withTimezone: true }),
        finishedAt: timestamp({ withTimezone: true }),
    },
    (table) => [index('test_runs_status_idx').on(table.status)],
);
