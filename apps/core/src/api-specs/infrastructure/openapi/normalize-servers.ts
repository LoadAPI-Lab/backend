import type { ApiSpecServer, ApiSpecServerVariable } from '../../domain/api-spec-document';
import { asNode, asNodes, asString, type DocumentNode } from './document-values';

const VARIABLE_PATTERN = /\{(?<name>[^{}]+)\}/g;
const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

const toVariable = (node: DocumentNode): ApiSpecServerVariable => {
    const description = asString(node['description']);
    const values = Array.isArray(node['enum']) ? node['enum'].map(String) : undefined;
    return {
        default: String(node['default'] ?? ''),
        ...(values && { enum: values }),
        ...(description !== undefined && { description }),
    };
};

const toVariables = (value: unknown): Record<string, ApiSpecServerVariable> =>
    Object.fromEntries(
        Object.entries(asNode(value) ?? {}).flatMap(([name, variable]) => {
            const node = asNode(variable);
            return node ? [[name, toVariable(node)]] : [];
        }),
    );

const toServer = (node: DocumentNode): ApiSpecServer[] => {
    const template = asString(node['url']);
    if (template === undefined) {
        return [];
    }

    const hasVariables = template.match(VARIABLE_PATTERN) !== null;
    const variables = toVariables(node['variables']);
    const url = template.replaceAll(
        VARIABLE_PATTERN,
        (match, name: string) => variables[name]?.default ?? match,
    );

    return [
        {
            url,
            ...(!ABSOLUTE_URL_PATTERN.test(url) && { relative: true as const }),
            ...(hasVariables && { template, variables }),
        },
    ];
};

export const normalizeServers = (servers: unknown): ApiSpecServer[] =>
    asNodes(servers).flatMap(toServer);
