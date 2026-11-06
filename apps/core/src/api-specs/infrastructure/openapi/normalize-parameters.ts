import type { ApiSpecParameter, ApiSpecParameterSchema } from '../../domain/api-spec-document';
import { PARAMETER_LOCATIONS, ParameterLocation } from '../../domain/constants';
import {
    asNode,
    asNodes,
    asString,
    type DocumentNode,
    firstDefined,
    firstExampleValue,
} from './document-values';
import { toExampleText, toJsonValue } from './example-text';

const NULL_TYPE = 'null';
const AUTHORIZATION_HEADER = 'Authorization';
const BEARER_DESCRIPTION = 'Bearer token';
const BASIC_DESCRIPTION = 'Basic credentials';

const asLocation = (value: unknown): ParameterLocation | undefined =>
    PARAMETER_LOCATIONS.find((location) => location === value);

const parameterKey = (parameter: Pick<ApiSpecParameter, 'name' | 'in'>): string =>
    `${parameter.in}:${parameter.in === ParameterLocation.HEADER ? parameter.name.toLowerCase() : parameter.name}`;

const schemaType = (value: unknown): string | undefined => {
    if (Array.isArray(value)) {
        return value.find((type): type is string => typeof type === 'string' && type !== NULL_TYPE);
    }
    return asString(value);
};

const toParameterSchema = (node: DocumentNode): ApiSpecParameterSchema => {
    const type = schemaType(node['type']);
    const format = asString(node['format']);
    const values = Array.isArray(node['enum']) ? toJsonValue(node['enum']) : undefined;
    const defaultValue = toJsonValue(node['default']);
    const example = toJsonValue(node['example']);
    return {
        ...(type !== undefined && { type }),
        ...(format !== undefined && { format }),
        ...(Array.isArray(values) && { enum: values }),
        ...(defaultValue !== undefined && { default: defaultValue }),
        ...(example !== undefined && { example }),
    };
};

const toParameter = (node: DocumentNode): ApiSpecParameter[] => {
    const name = asString(node['name']);
    const location = asLocation(node['in']);
    if (name === undefined || location === undefined) {
        return [];
    }

    const schemaNode = asNode(node['schema']) ?? {};
    const description = asString(node['description']);
    const example = toExampleText(
        firstDefined(
            node['example'],
            firstExampleValue(node['examples']),
            schemaNode['example'],
            schemaNode['default'],
        ),
    );

    return [
        {
            name,
            in: location,
            required: location === ParameterLocation.PATH || node['required'] === true,
            ...(description !== undefined && { description }),
            schema: toParameterSchema(schemaNode),
            ...(example !== undefined && { example }),
        },
    ];
};

const authorizationHeader = (description: string): ApiSpecParameter => ({
    name: AUTHORIZATION_HEADER,
    in: ParameterLocation.HEADER,
    required: true,
    description,
    schema: {},
});

const toSecurityParameter = (scheme: DocumentNode): ApiSpecParameter[] => {
    switch (scheme['type']) {
        case 'http': {
            const httpScheme = asString(scheme['scheme'])?.toLowerCase();
            if (httpScheme === 'bearer') {
                return [authorizationHeader(BEARER_DESCRIPTION)];
            }
            if (httpScheme === 'basic') {
                return [authorizationHeader(BASIC_DESCRIPTION)];
            }
            return [];
        }
        case 'oauth2':
        case 'openIdConnect': {
            return [authorizationHeader(BEARER_DESCRIPTION)];
        }
        case 'apiKey': {
            const name = asString(scheme['name']);
            const location = asLocation(scheme['in']);
            return name !== undefined && location !== undefined
                ? [{ name, in: location, required: true, schema: {} }]
                : [];
        }
        default: {
            return [];
        }
    }
};

export const mergeParameters = (
    pathParameters: unknown,
    operationParameters: unknown,
): ApiSpecParameter[] => {
    const merged = new Map<string, ApiSpecParameter>();
    for (const parameter of [
        ...asNodes(pathParameters).flatMap(toParameter),
        ...asNodes(operationParameters).flatMap(toParameter),
    ]) {
        merged.set(parameterKey(parameter), parameter);
    }
    return [...merged.values()];
};

export const securityParameters = (
    requirements: unknown,
    schemes: DocumentNode | undefined,
): ApiSpecParameter[] => {
    const [requirement] = asNodes(requirements);
    if (!requirement) {
        return [];
    }
    return Object.keys(requirement).flatMap((name) => {
        const scheme = asNode(schemes?.[name]);
        return scheme ? toSecurityParameter(scheme) : [];
    });
};

export const appendMissingParameters = (
    parameters: ApiSpecParameter[],
    additions: ApiSpecParameter[],
): ApiSpecParameter[] => {
    const keys = new Set(parameters.map(parameterKey));
    const missing = additions.filter((parameter) => {
        const key = parameterKey(parameter);
        if (keys.has(key)) {
            return false;
        }
        keys.add(key);
        return true;
    });
    return [...parameters, ...missing];
};
