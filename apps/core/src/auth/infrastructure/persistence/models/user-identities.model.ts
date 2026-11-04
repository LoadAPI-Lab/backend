import { users } from '@core/users/infrastructure/persistence/models';
import { index, pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';

import { oauthProviderEnum } from './enums';

const PROVIDER_USER_ID_MAX_LENGTH = 255;

export const userIdentities = pgTable(
    'user_identities',
    {
        id: uuid().primaryKey(),
        userId: uuid()
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        provider: oauthProviderEnum().notNull(),
        providerUserId: varchar({ length: PROVIDER_USER_ID_MAX_LENGTH }).notNull(),
        createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        unique('user_identities_provider_user_unique').on(table.provider, table.providerUserId),
        index('user_identities_user_id_idx').on(table.userId),
    ],
);
