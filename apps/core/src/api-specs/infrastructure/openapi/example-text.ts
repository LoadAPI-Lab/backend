export const stringifySafely = (value: unknown, indent?: number): string | undefined => {
    try {
        return JSON.stringify(value, null, indent);
    } catch {
        return undefined;
    }
};

export const toJsonValue = (value: unknown): unknown => {
    const text = stringifySafely(value);
    return text === undefined ? undefined : JSON.parse(text);
};

export const toExampleText = (value: unknown): string | undefined => {
    if (value === undefined) {
        return undefined;
    }
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    return stringifySafely(value);
};
