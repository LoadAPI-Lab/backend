import { createHash } from 'node:crypto';

import type { TestConfigInput } from './schemas';

const HASH_ALGORITHM = 'sha256';
const HASH_ENCODING = 'hex';

type CanonicalValue = null | boolean | number | string | CanonicalValue[] | CanonicalObject;
interface CanonicalObject {
    [key: string]: CanonicalValue;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const canonicalize = (value: unknown): CanonicalValue => {
    if (Array.isArray(value)) {
        return value.map(canonicalize);
    }

    if (isPlainObject(value)) {
        return Object.fromEntries(
            Object.keys(value)
                .filter((key) => value[key] !== undefined)
                .sort()
                .map((key) => [key, canonicalize(value[key])]),
        );
    }

    return value as CanonicalValue;
};

export const hashTestConfig = ({ type, config }: TestConfigInput): string =>
    createHash(HASH_ALGORITHM)
        .update(JSON.stringify(canonicalize({ type, config })))
        .digest(HASH_ENCODING);
