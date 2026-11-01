export function describeError(error: unknown): string {
    if (!(error instanceof Error)) {
        return 'unknown error';
    }

    const { cause } = error;
    const code = cause instanceof Object && 'code' in cause ? String(cause.code) : undefined;
    return code ? `${error.name} (${code})` : error.name;
}
