import {
    MAX_SAMPLE_DEPTH,
    MAX_SAMPLE_SCHEMA_NODES,
    MAX_SCHEMA_REFERENCE_REPEATS,
} from '../../domain/constants';
import { asNode, asNodes, asString, type DocumentNode, firstDefined } from './document-values';
import { resolveReferenceChain } from './json-pointer';

export interface SchemaExampleOptions {
    readonly root: DocumentNode;
    readonly today: Date;
}

type ReferenceCounts = ReadonlyMap<string, number>;

interface WalkState extends SchemaExampleOptions {
    visited: number;
}

interface Shape {
    readonly node: DocumentNode;
    readonly references: ReferenceCounts;
}

interface Slot {
    readonly name?: string;
    readonly property: boolean;
    readonly depth: number;
    readonly references: ReferenceCounts;
}

const NULL_TYPE = 'null';
const MAP_KEY = 'key';
const EXAMPLE_TEXT = 'example';
const PADDING_CHARACTER = 'x';
const EXAMPLE_URL = 'https://example.com';
const DEFAULT_NUMBER = 1;
const INTEGER_STEP = 1;
const MIN_ARRAY_ITEMS = 1;
const ISO_DATE_LENGTH = 10;
const COMPOSITION_KEYS = new Set(['allOf', 'oneOf', 'anyOf']);
const URL_NAME_RE = /(?:^|[_-])(?:url|uri|URL|URI)$|[a-z\d](?:Url|Uri|URL|URI)$/;

const FORMAT_VALUES: Readonly<Record<string, string>> = {
    uuid: '{{$uuid}}',
    email: '{{$randomEmail}}',
    'date-time': '{{$timestamp}}',
    uri: EXAMPLE_URL,
    url: EXAMPLE_URL,
    'uri-reference': EXAMPLE_URL,
    iri: EXAMPLE_URL,
};

const asNumber = (value: unknown): number | undefined =>
    typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const firstItem = (value: unknown): unknown => (Array.isArray(value) ? value[0] : undefined);

const countReferences = (
    counts: ReferenceCounts,
    references: readonly string[],
): ReferenceCounts | undefined => {
    const next = new Map(counts);
    for (const reference of references) {
        const count = (next.get(reference) ?? 0) + 1;
        if (count > MAX_SCHEMA_REFERENCE_REPEATS) {
            return undefined;
        }
        next.set(reference, count);
    }
    return next;
};

const unionCounts = (first: ReferenceCounts, second: ReferenceCounts): ReferenceCounts => {
    const union = new Map(first);
    for (const [reference, count] of second) {
        union.set(reference, Math.max(count, union.get(reference) ?? 0));
    }
    return union;
};

const withoutComposition = (node: DocumentNode): DocumentNode =>
    Object.fromEntries(Object.entries(node).filter(([key]) => !COMPOSITION_KEYS.has(key)));

const mergeNodes = (lower: DocumentNode, upper: DocumentNode): DocumentNode => {
    const properties = { ...asNode(lower['properties']), ...asNode(upper['properties']) };
    return {
        ...lower,
        ...upper,
        ...(Object.keys(properties).length > 0 && { properties }),
    };
};

const membersOf = (node: DocumentNode): DocumentNode[] => {
    const [firstOneOf] = asNodes(node['oneOf']);
    const [firstAnyOf] = asNodes(node['anyOf']);
    const variant = firstOneOf ?? firstAnyOf;
    return [...asNodes(node['allOf']), ...(variant ? [variant] : [])];
};

const flatten = (value: unknown, counts: ReferenceCounts, state: WalkState): Shape | undefined => {
    if (state.visited >= MAX_SAMPLE_SCHEMA_NODES) {
        return undefined;
    }
    state.visited += 1;

    const { value: resolved, references } = resolveReferenceChain(state.root, value);
    const node = asNode(resolved);
    const nodeCounts = countReferences(counts, references);
    if (!node || !nodeCounts) {
        return undefined;
    }

    let members: DocumentNode = {};
    let shapeCounts = nodeCounts;
    for (const member of membersOf(node)) {
        const shape = flatten(member, nodeCounts, state);
        if (shape) {
            members = mergeNodes(members, shape.node);
            shapeCounts = unionCounts(shapeCounts, shape.references);
        }
    }
    return { node: mergeNodes(members, withoutComposition(node)), references: shapeCounts };
};

const givenValue = (node: DocumentNode): unknown =>
    firstDefined(
        node['example'],
        firstItem(node['examples']),
        node['default'],
        node['const'],
        firstItem(node['enum']),
    );

const typeOf = (node: DocumentNode): string | undefined => {
    const { type } = node;
    if (Array.isArray(type)) {
        return type.find((item): item is string => typeof item === 'string' && item !== NULL_TYPE);
    }
    const declared = asString(type);
    if (declared !== undefined) {
        return declared;
    }
    if (asNode(node['properties']) || asNode(node['additionalProperties'])) {
        return 'object';
    }
    return node['items'] === undefined ? undefined : 'array';
};

const lowerBound = (node: DocumentNode, step: number): number | undefined => {
    const exclusive = node['exclusiveMinimum'];
    const exclusiveValue = asNumber(exclusive);
    if (exclusiveValue !== undefined) {
        return exclusiveValue + step;
    }
    const minimum = asNumber(node['minimum']);
    if (minimum === undefined) {
        return undefined;
    }
    return exclusive === true ? minimum + step : minimum;
};

const upperBound = (node: DocumentNode, step: number): number | undefined => {
    const exclusive = node['exclusiveMaximum'];
    const exclusiveValue = asNumber(exclusive);
    if (exclusiveValue !== undefined) {
        return exclusiveValue - step;
    }
    const maximum = asNumber(node['maximum']);
    if (maximum === undefined) {
        return undefined;
    }
    return exclusive === true ? maximum - step : maximum;
};

const numberValue = (node: DocumentNode, integer: boolean): number => {
    const lower = lowerBound(node, INTEGER_STEP) ?? DEFAULT_NUMBER;
    const value = integer ? Math.ceil(lower) : lower;
    const upper = upperBound(node, INTEGER_STEP);
    if (upper === undefined || value <= upper) {
        return value;
    }
    return integer ? Math.floor(upper) : upper;
};

const plainText = (node: DocumentNode): string => {
    const minLength = asNumber(node['minLength']) ?? 0;
    const maxLength = asNumber(node['maxLength']);
    const text = EXAMPLE_TEXT.padEnd(minLength, PADDING_CHARACTER);
    return maxLength === undefined ? text : text.slice(0, maxLength);
};

const stringValue = (node: DocumentNode, slot: Slot, state: WalkState): string => {
    const format = asString(node['format'])?.toLowerCase();
    if (format === 'date') {
        return state.today.toISOString().slice(0, ISO_DATE_LENGTH);
    }
    const formatted = format === undefined ? undefined : FORMAT_VALUES[format];
    if (formatted !== undefined) {
        return formatted;
    }
    if (slot.name !== undefined && URL_NAME_RE.test(slot.name)) {
        return EXAMPLE_URL;
    }
    return plainText(node);
};

const childSlot = (
    shape: Shape,
    slot: Slot,
    name: string | undefined,
    property: boolean,
): Slot => ({
    ...(name !== undefined && { name }),
    property,
    depth: slot.depth + 1,
    references: shape.references,
});

const valueOf = (schema: unknown, slot: Slot, state: WalkState): unknown => {
    if (slot.depth > MAX_SAMPLE_DEPTH) {
        return undefined;
    }
    const shape = flatten(schema, slot.references, state);
    if (!shape || (slot.property && shape.node['readOnly'] === true)) {
        return undefined;
    }
    const { node } = shape;
    const given = givenValue(node);
    if (given !== undefined) {
        return given;
    }

    switch (typeOf(node)) {
        case 'object': {
            return objectValue(shape, slot, state);
        }
        case 'array': {
            return arrayValue(shape, slot, state);
        }
        case 'string': {
            return stringValue(node, slot, state);
        }
        case 'integer': {
            return numberValue(node, true);
        }
        case 'number': {
            return numberValue(node, false);
        }
        case 'boolean': {
            return true;
        }
        case NULL_TYPE: {
            return null;
        }
        default: {
            return undefined;
        }
    }
};

function objectValue(shape: Shape, slot: Slot, state: WalkState): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [name, schema] of Object.entries(asNode(shape.node['properties']) ?? {})) {
        const value = valueOf(schema, childSlot(shape, slot, name, true), state);
        if (value !== undefined) {
            result[name] = value;
        }
    }
    const extra = asNode(shape.node['additionalProperties']);
    if (extra && !(MAP_KEY in result)) {
        const value = valueOf(extra, childSlot(shape, slot, undefined, false), state);
        if (value !== undefined) {
            result[MAP_KEY] = value;
        }
    }
    return result;
}

function arrayValue(shape: Shape, slot: Slot, state: WalkState): unknown[] {
    const item = valueOf(shape.node['items'], childSlot(shape, slot, slot.name, false), state);
    if (item === undefined) {
        return [];
    }
    const count = Math.max(MIN_ARRAY_ITEMS, asNumber(shape.node['minItems']) ?? 0);
    return Array.from({ length: count }, () => item);
}

export const exampleFromSchema = (schema: unknown, options: SchemaExampleOptions): unknown =>
    valueOf(
        schema,
        { property: false, depth: 0, references: new Map() },
        { ...options, visited: 0 },
    );
