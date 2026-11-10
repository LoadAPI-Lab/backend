import { MAX_GENERATED_EXAMPLE_BYTES } from '../../domain/constants';
import { asNode, type DocumentNode } from './document-values';
import { exampleFromSchema } from './schema-example';

const sampleValue = (schema: DocumentNode, root: DocumentNode): unknown => {
    try {
        return exampleFromSchema(schema, { root, today: new Date() });
    } catch {
        return undefined;
    }
};

export const sampleExample = (
    schema: unknown,
    root: DocumentNode,
    format: (value: unknown) => string | undefined,
): string | undefined => {
    const node = asNode(schema);
    if (!node) {
        return undefined;
    }
    const value = sampleValue(node, root);
    if (value === undefined) {
        return undefined;
    }
    const text = format(value);
    if (text === undefined || Buffer.byteLength(text, 'utf8') > MAX_GENERATED_EXAMPLE_BYTES) {
        return undefined;
    }
    return text;
};
