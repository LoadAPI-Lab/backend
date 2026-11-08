import { users } from '@core/users/infrastructure/persistence/models';
import {
    index,
    integer,
    jsonb,
    pgTable,
    text,
    timestamp,
    uuid,
    varchar,
} from 'drizzle-orm/pg-core';

import type { ApiSpecEndpoint, ApiSpecServer } from '../../../domain/api-spec-document';
import { NAME_MAX_LENGTH } from '../../../domain/constants';

export const apiSpecs = pgTable(
    'api_specs',
    {
        id: uuid().primaryKey(),
        userId: uuid()
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        name: varchar({ length: NAME_MAX_LENGTH }).notNull(),
        title: text().notNull(),
        version: text().notNull(),
        description: text(),
        source: text().notNull(),
        servers: jsonb().$type<ApiSpecServer[]>().notNull(),
        endpoints: jsonb().$type<ApiSpecEndpoint[]>().notNull(),
        endpointsCount: integer().notNull(),
        createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        index('api_specs_user_created_at_idx').on(
            table.userId,
            table.createdAt.desc(),
            table.id.desc(),
        ),
    ],
);
