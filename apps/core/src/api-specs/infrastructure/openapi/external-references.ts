import type { ErrorDetail } from '@shared/error';

import { invalidSpecDetail } from './spec-errors';

const REFERENCE_KEY = '$ref';
const INTERNAL_REFERENCE_PREFIX = '#';
const EXTERNAL_REFERENCE_MESSAGE =
    'External references are not allowed, only internal "#/..." references are supported';

interface PendingValue {
    readonly value: unknown;
    readonly path: string;
}

const childPath = (parent: string, key: string): string => (parent ? `${parent}.${key}` : key);

const isExternalReference = (key: string, value: unknown): boolean =>
    key === REFERENCE_KEY &&
    typeof value === 'string' &&
    !value.startsWith(INTERNAL_REFERENCE_PREFIX);

export const findExternalReferences = (root: unknown): ErrorDetail[] => {
    const found: ErrorDetail[] = [];
    const pending: PendingValue[] = [{ value: root, path: '' }];

    for (const { value, path } of pending) {
        const children = typeof value === 'object' && value !== null ? Object.entries(value) : [];
        for (const [key, child] of children) {
            const location = childPath(path, key);
            if (isExternalReference(key, child)) {
                found.push(invalidSpecDetail(location, EXTERNAL_REFERENCE_MESSAGE));
            } else {
                pending.push({ value: child, path: location });
            }
        }
    }

    return found;
};
