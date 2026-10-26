import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Options, PostgresType } from 'postgres';

export interface DatabaseModuleOptions {
    readonly schemaName?: string;
    readonly schema: Record<string, unknown>;
    readonly pool?: Options<Record<string, PostgresType<any>>>;
    readonly logging?: boolean;
    readonly runMigrations?: boolean;
    readonly migrationsPath?: string;
}

export type DatabaseSchema = Record<string, unknown>;

export type DatabaseService<TSchema extends DatabaseSchema = DatabaseSchema> =
    PostgresJsDatabase<TSchema>;
