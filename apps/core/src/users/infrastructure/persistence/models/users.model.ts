import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

const EMAIL_MAX_LENGTH = 255;
const NAME_MAX_LENGTH = 255;

export const users = pgTable('users', {
    id: uuid().primaryKey(),
    email: varchar({ length: EMAIL_MAX_LENGTH }).notNull().unique(),
    name: varchar({ length: NAME_MAX_LENGTH }).notNull(),
    avatarUrl: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
