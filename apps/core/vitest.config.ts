import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            src: path.resolve(__dirname, './src'),
        },
    },
    test: {
        alias: {
            '@core': path.resolve(__dirname, './src'),
        },
        environment: 'node',
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/cypress/**',
            '**/.{idea,git,cache,output,temp}/**',
            '**/infra/**',
        ],
        globals: true,
        include: ['**/*.spec.ts'],
        root: './',
        typecheck: {
            enabled: true,
        },
    },
});
