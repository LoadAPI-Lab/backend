import { users } from '@core/users/infrastructure/persistence/models';
import { index, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

export const sessions = pgTable(
    'sessions',
    {
        id: uuid().primaryKey(),
        userId: uuid()
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        refreshJti: uuid().notNull(),
        expiresAt: timestamp({ withTimezone: true }).notNull(),
        revokedAt: timestamp({ withTimezone: true }),
        createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [index('sessions_user_id_idx').on(table.userId)],
);
