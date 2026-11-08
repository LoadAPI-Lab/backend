import type { JSONSchema7 } from 'json-schema';
import { sample } from 'openapi-sampler';

import { MAX_GENERATED_EXAMPLE_BYTES, MAX_SAMPLE_DEPTH } from '../../domain/constants';
import { asNode, type DocumentNode } from './document-values';

const SAMPLER_OPTIONS = {
    skipReadOnly: true,
    quiet: true,
    maxSampleDepth: MAX_SAMPLE_DEPTH,
} as const;

const sampleValue = (schema: DocumentNode, root: DocumentNode): unknown => {
    try {
        return sample(schema as JSONSchema7, SAMPLER_OPTIONS, root);
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
