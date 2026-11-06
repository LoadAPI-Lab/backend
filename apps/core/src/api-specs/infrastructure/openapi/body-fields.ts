import type { ApiSpecBodyField } from '../../domain/api-spec-document';
import {
    BODY_FIELD_TYPES,
    type BodyFieldType,
    MAX_FIELD_DEPTH,
    MAX_FIELD_SCHEMA_NODES,
} from '../../domain/constants';
import { asNode, asNodes, asString, type DocumentNode } from './document-values';
import { resolveReferenceChain } from './json-pointer';

const OBJECT_TYPE = 'object';
const ARRAY_TYPE = 'array';
const NULL_TYPE = 'null';
const ARRAY_ITEM_SEGMENT = '0';
const PATH_SEPARATOR = '.';

interface SchemaShape {
    type?: string;
    format?: string;
    readOnly: boolean;
    readonly properties: Map<string, unknown>;
    readonly required: Set<string>;
    hasProperties: boolean;
    items?: unknown;
    readonly references: Set<string>;
}

interface WalkState {
    readonly root: DocumentNode;
    readonly fields: ApiSpecBodyField[];
    visited: number;
}

interface FieldSlot {
    readonly segments: string[];
    readonly required: boolean;
    readonly property: boolean;
    readonly references: ReadonlySet<string>;
}

const isExhausted = (state: WalkState): boolean => state.visited >= MAX_FIELD_SCHEMA_NODES;

const typeOf = (node: DocumentNode): string | undefined => {
    const {type} = node;
    if (Array.isArray(type)) {
        return type.find((item): item is string => typeof item === 'string' && item !== NULL_TYPE);
    }
    return asString(type);
};

const isBodyFieldType = (type: string | undefined): type is BodyFieldType =>
    BODY_FIELD_TYPES.some((fieldType) => fieldType === type);

const requiredNames = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((name): name is string => typeof name === 'string') : [];

const mergeShape = (target: SchemaShape, source: SchemaShape): void => {
    target.type ??= source.type;
    target.format ??= source.format;
    target.readOnly ||= source.readOnly;
    target.hasProperties ||= source.hasProperties;
    target.items ??= source.items;
    for (const [name, schema] of source.properties) {
        if (!target.properties.has(name)) {
            target.properties.set(name, schema);
        }
    }
    for (const name of source.required) {
        target.required.add(name);
    }
    for (const reference of source.references) {
        target.references.add(reference);
    }
};

const ownShape = (node: DocumentNode, references: Set<string>): SchemaShape => {
    const properties = asNode(node['properties']);
    return {
        type: typeOf(node),
        format: asString(node['format']),
        readOnly: node['readOnly'] === true,
        properties: new Map(Object.entries(properties ?? {})),
        required: new Set(requiredNames(node['required'])),
        hasProperties: properties !== undefined,
        items: node['items'],
        references,
    };
};

const variantsOf = (node: DocumentNode): DocumentNode[] => {
    const [firstOneOf] = asNodes(node['oneOf']);
    const [firstAnyOf] = asNodes(node['anyOf']);
    const variant = firstOneOf ?? firstAnyOf;
    return [...asNodes(node['allOf']), ...(variant ? [variant] : [])];
};

const shapeOf = (
    value: unknown,
    state: WalkState,
    pathReferences: ReadonlySet<string>,
): SchemaShape | undefined => {
    if (isExhausted(state)) {
        return undefined;
    }
    state.visited += 1;

    const { value: resolved, references } = resolveReferenceChain(state.root, value);
    if (references.some((reference) => pathReferences.has(reference))) {
        return undefined;
    }
    const node = asNode(resolved);
    if (!node) {
        return undefined;
    }

    const shape = ownShape(node, new Set([...pathReferences, ...references]));
    for (const variant of variantsOf(node)) {
        const variantShape = shapeOf(variant, state, shape.references);
        if (variantShape) {
            mergeShape(shape, variantShape);
        }
    }
    return shape;
};

const isObjectShape = (shape: SchemaShape): boolean =>
    shape.type === OBJECT_TYPE || shape.hasProperties;

const isArrayShape = (shape: SchemaShape): boolean =>
    shape.type === ARRAY_TYPE || shape.items !== undefined;

const walk = (value: unknown, slot: FieldSlot, state: WalkState): void => {
    if (slot.segments.length > MAX_FIELD_DEPTH) {
        return;
    }
    const shape = shapeOf(value, state, slot.references);
    if (!shape || (slot.property && shape.readOnly)) {
        return;
    }

    if (isObjectShape(shape)) {
        for (const [name, schema] of shape.properties) {
            if (isExhausted(state)) {
                return;
            }
            if (name.includes(PATH_SEPARATOR)) {
                continue;
            }
            walk(
                schema,
                {
                    segments: [...slot.segments, name],
                    required: shape.required.has(name),
                    property: true,
                    references: shape.references,
                },
                state,
            );
        }
        return;
    }

    if (isArrayShape(shape)) {
        walk(
            shape.items,
            {
                segments: [...slot.segments, ARRAY_ITEM_SEGMENT],
                required: false,
                property: false,
                references: shape.references,
            },
            state,
        );
        return;
    }

    if (slot.segments.length === 0 || !isBodyFieldType(shape.type)) {
        return;
    }
    state.fields.push({
        path: slot.segments.join(PATH_SEPARATOR),
        type: shape.type,
        ...(shape.format !== undefined && { format: shape.format }),
        required: slot.required,
    });
};

export const collectBodyFields = (schema: unknown, root: DocumentNode): ApiSpecBodyField[] => {
    const state: WalkState = { root, fields: [], visited: 0 };
    try {
        walk(
            schema,
            { segments: [], required: false, property: false, references: new Set() },
            state,
        );
    } catch {
        return state.fields;
    }
    return state.fields;
};
