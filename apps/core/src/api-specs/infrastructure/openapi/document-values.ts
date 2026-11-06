export type DocumentNode = Record<string, unknown>;

export const asNode = (value: unknown): DocumentNode | undefined =>
    typeof value === 'object' && value !== null && !Array.isArray(value)
        ? (value as DocumentNode)
        : undefined;

export const asString = (value: unknown): string | undefined =>
    typeof value === 'string' ? value : undefined;

export const asNodes = (value: unknown): DocumentNode[] =>
    Array.isArray(value)
        ? value.flatMap((item) => {
              const node = asNode(item);
              return node ? [node] : [];
          })
        : [];

export const firstDefined = (...values: unknown[]): unknown =>
    values.find((value) => value !== undefined);

export const firstExampleValue = (examples: unknown): unknown => {
    const node = asNode(examples);
    if (!node) {
        return undefined;
    }
    const [first] = Object.values(node);
    return asNode(first)?.['value'];
};

export const isExtensionKey = (key: string): boolean => key.startsWith('x-');
