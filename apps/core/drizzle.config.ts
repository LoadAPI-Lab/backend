import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './src/shared/entities/index.ts',
    out: './migrations',
    dialect: 'postgresql',
    breakpoints: false,
    casing: 'snake_case',
    strict: true,
    verbose: true,
    dbCredentials: {
        url: process.env['DATABASE_URL'] ?? 'postgres://loadapi:loadapi@localhost:5432/loadapi',
    },
    introspect: { casing: 'camel' },
    schemaFilter: ['*'],
});
