export default {
    'apps/core/**/*.ts': [
        'pnpm -C apps/core exec oxfmt',
        'pnpm -C apps/core exec oxlint --fix --no-error-on-unmatched-pattern',
    ],
    'apps/worker/**/*.go': ['gofmt -w'],
};