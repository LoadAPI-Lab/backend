import type { ApiSpecBodyField, ApiSpecRequestBody } from '../../domain/api-spec-document';
import { collectBodyFields } from './body-fields';
import { asNode, type DocumentNode, firstDefined, firstExampleValue } from './document-values';
import { stringifySafely } from './example-text';
import { resolveReferences } from './json-pointer';
import { sampleExample } from './sample-example';

const JSON_MEDIA_TYPE = 'application/json';
const JSON_SUFFIX = '+json';
const FORM_MEDIA_TYPE = 'application/x-www-form-urlencoded';
const JSON_INDENT = 2;

const essence = (mediaType: string): string => {
    const [type = ''] = mediaType.split(';');
    return type.trim().toLowerCase();
};

const isJsonMediaType = (mediaType: string): boolean => {
    const type = essence(mediaType);
    return type === JSON_MEDIA_TYPE || type.endsWith(JSON_SUFFIX);
};

const pickContentType = (mediaTypes: string[]): string | undefined => {
    const [first] = mediaTypes;
    return (
        mediaTypes.find((type) => essence(type) === JSON_MEDIA_TYPE) ??
        mediaTypes.find((type) => essence(type).endsWith(JSON_SUFFIX)) ??
        first
    );
};

const prettyJson = (example: unknown): string | undefined => {
    if (typeof example !== 'string') {
        return stringifySafely(example, JSON_INDENT);
    }
    try {
        return JSON.stringify(JSON.parse(example), null, JSON_INDENT);
    } catch {
        return example;
    }
};

const formFieldValues = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.flatMap(formFieldValues);
    }
    if (typeof value === 'string') {
        return [value];
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return [String(value)];
    }
    const text = stringifySafely(value);
    return text === undefined ? [] : [text];
};

const formEncoded = (example: unknown): string | undefined => {
    if (typeof example === 'string') {
        return example;
    }
    const fields = asNode(example);
    if (!fields) {
        return undefined;
    }
    const params = new URLSearchParams();
    for (const [name, value] of Object.entries(fields)) {
        for (const text of formFieldValues(value)) {
            params.append(name, text);
        }
    }
    return params.toString();
};

const isSampledMediaType = (contentType: string): boolean =>
    isJsonMediaType(contentType) || essence(contentType) === FORM_MEDIA_TYPE;

const formatExample = (contentType: string, example: unknown): string | undefined => {
    if (example === undefined) {
        return undefined;
    }
    if (isJsonMediaType(contentType)) {
        return prettyJson(example);
    }
    if (essence(contentType) === FORM_MEDIA_TYPE) {
        return formEncoded(example);
    }
    return typeof example === 'string' ? example : undefined;
};

export interface RawRequestBody {
    readonly value: unknown;
    readonly root: DocumentNode;
}

const rawSchema = ({ value, root }: RawRequestBody, contentType: string): unknown => {
    const content = asNode(asNode(resolveReferences(root, value))?.['content']);
    return asNode(resolveReferences(root, content?.[contentType]))?.['schema'];
};

const hasExample = (media: DocumentNode): boolean =>
    media['example'] !== undefined || media['examples'] !== undefined;

const toExample = (
    contentType: string,
    media: DocumentNode,
    raw: RawRequestBody,
): string | undefined => {
    if (hasExample(media)) {
        return formatExample(
            contentType,
            firstDefined(media['example'], firstExampleValue(media['examples'])),
        );
    }
    if (!isSampledMediaType(contentType)) {
        return undefined;
    }
    return sampleExample(rawSchema(raw, contentType), raw.root, (value) =>
        formatExample(contentType, value),
    );
};

const toFields = (contentType: string, raw: RawRequestBody): ApiSpecBodyField[] =>
    isSampledMediaType(contentType) ? collectBodyFields(rawSchema(raw, contentType), raw.root) : [];

export const normalizeRequestBody = (
    value: unknown,
    raw: RawRequestBody,
): ApiSpecRequestBody | undefined => {
    const body = asNode(value);
    if (!body) {
        return undefined;
    }

    const content = asNode(body['content']) ?? {};
    const contentType = pickContentType(Object.keys(content));
    if (contentType === undefined) {
        return undefined;
    }

    const media: DocumentNode = asNode(content[contentType]) ?? {};
    const example = toExample(contentType, media, raw);
    const fields = toFields(contentType, raw);

    return {
        required: body['required'] === true,
        contentType,
        ...(example !== undefined && { example }),
        ...(fields.length > 0 && { fields }),
    };
};
