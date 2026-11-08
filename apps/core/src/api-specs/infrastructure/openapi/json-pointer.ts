const ROOT_FIELD = 'content';

const unescapeSegment = (segment: string): string =>
    segment.replaceAll('~1', '/').replaceAll('~0', '~');

const pointerSegments = (pointer: string): string[] => {
    const [, ...tokens] = pointer.split('/');
    return tokens.map(unescapeSegment);
};

export const toDotPath = (pointer: string | string[] | undefined): string => {
    const segments = Array.isArray(pointer) ? pointer : pointerSegments(pointer ?? '');
    return segments.length ? segments.join('.') : ROOT_FIELD;
};

const REFERENCE_KEY = '$ref';
const INTERNAL_REFERENCE_PREFIX = '#';

const isContainer = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const valueAt = (root: unknown, pointer: string): unknown => {
    let node = root;
    for (const segment of pointerSegments(pointer)) {
        if (!isContainer(node)) {
            return undefined;
        }
        node = node[segment];
    }
    return node;
};

const referenceOf = (value: unknown): string | undefined => {
    if (!isContainer(value)) {
        return undefined;
    }
    const reference = value[REFERENCE_KEY];
    if (typeof reference !== 'string' || !reference.startsWith(INTERNAL_REFERENCE_PREFIX)) {
        return undefined;
    }
    return reference.slice(INTERNAL_REFERENCE_PREFIX.length);
};

export interface ResolvedReference {
    readonly value: unknown;
    readonly references: string[];
}

export const resolveReferenceChain = (root: unknown, value: unknown): ResolvedReference => {
    const references: string[] = [];
    let current = value;
    let reference = referenceOf(current);
    while (reference !== undefined) {
        if (references.includes(reference)) {
            return { value: undefined, references };
        }
        references.push(reference);
        current = valueAt(root, reference);
        reference = referenceOf(current);
    }
    return { value: current, references };
};

export const resolveReferences = (root: unknown, value: unknown): unknown =>
    resolveReferenceChain(root, value).value;
