import { users } from '@core/users/infrastructure/persistence/models';
import type { ScenarioConfig } from '@shared/scenario';
import { index, integer, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { SCENARIO_NAME_MAX_LENGTH } from '../../../domain/constants';

export const scenarios = pgTable(
    'scenarios',
    {
        id: uuid().primaryKey(),
        userId: uuid()
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        name: varchar({ length: SCENARIO_NAME_MAX_LENGTH }).notNull(),
        config: jsonb().$type<ScenarioConfig>().notNull(),
        stepsCount: integer().notNull(),
        createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        index('scenarios_user_created_at_idx').on(
            table.userId,
            table.createdAt.desc(),
            table.id.desc(),
        ),
    ],
);
