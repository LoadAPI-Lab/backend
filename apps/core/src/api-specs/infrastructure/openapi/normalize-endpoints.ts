import { HttpMethod } from '@shared/constants';

import type { ApiSpecEndpoint, ApiSpecEndpointResponse } from '../../domain/api-spec-document';
import { asNode, asString, type DocumentNode, isExtensionKey } from './document-values';
import { endpointId } from './endpoint-id';
import { resolveReferences } from './json-pointer';
import {
    appendMissingParameters,
    mergeParameters,
    securityParameters,
} from './normalize-parameters';
import { normalizeRequestBody } from './normalize-request-body';
import type { ResponseOrder } from './spec-source';

const OPERATION_METHODS: ReadonlyMap<string, HttpMethod> = new Map([
    ['get', HttpMethod.GET],
    ['put', HttpMethod.PUT],
    ['post', HttpMethod.POST],
    ['delete', HttpMethod.DELETE],
    ['options', HttpMethod.OPTIONS],
    ['head', HttpMethod.HEAD],
    ['patch', HttpMethod.PATCH],
]);

interface OperationContext {
    readonly path: string;
    readonly pathItem: DocumentNode;
    readonly root: DocumentNode;
    readonly rootSecurity: unknown;
    readonly securitySchemes: DocumentNode | undefined;
    readonly responseOrder: ResponseOrder;
}

const orderedStatuses = (responses: DocumentNode, order: string[] | undefined): string[] => {
    const statuses = Object.keys(responses).filter((status) => !isExtensionKey(status));
    if (!order) {
        return statuses;
    }
    return [
        ...order.filter((status) => statuses.includes(status)),
        ...statuses.filter((status) => !order.includes(status)),
    ];
};

const toResponses = (value: unknown, order: string[] | undefined): ApiSpecEndpointResponse[] => {
    const responses = asNode(value) ?? {};
    return orderedStatuses(responses, order).map((status) => ({
        status,
        description: asString(asNode(responses[status])?.['description']) ?? '',
    }));
};

const toTags = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((tag): tag is string => typeof tag === 'string') : [];

interface OperationEntry {
    readonly field: string;
    readonly method: HttpMethod;
    readonly operation: DocumentNode;
}

const toEndpoint = (
    { field, method, operation }: OperationEntry,
    context: OperationContext,
): ApiSpecEndpoint => {
    const key = `${method} ${context.path}`;
    const summary = asString(operation['summary']);
    const description = asString(operation['description']);
    const rawPathItem = resolveReferences(
        context.root,
        asNode(context.root['paths'])?.[context.path],
    );
    const rawOperation = asNode(asNode(rawPathItem)?.[field]);
    const requestBody = normalizeRequestBody(operation['requestBody'], {
        value: rawOperation?.['requestBody'],
        root: context.root,
    });
    const security =
        operation['security'] === undefined ? context.rootSecurity : operation['security'];
    const parameters = appendMissingParameters(
        mergeParameters(context.pathItem['parameters'], operation['parameters']),
        securityParameters(security, context.securitySchemes),
    );

    return {
        id: endpointId(key),
        key,
        method,
        path: context.path,
        ...(summary !== undefined && { summary }),
        ...(description !== undefined && { description }),
        tags: toTags(operation['tags']),
        ...(operation['deprecated'] === true && { deprecated: true as const }),
        parameters,
        ...(requestBody && { requestBody }),
        responses: toResponses(operation['responses'], context.responseOrder(context.path, field)),
    };
};

const pathEndpoints = (context: OperationContext): ApiSpecEndpoint[] =>
    Object.entries(context.pathItem).flatMap(([field, value]) => {
        const method = OPERATION_METHODS.get(field);
        const operation = asNode(value);
        return method && operation ? [toEndpoint({ field, method, operation }, context)] : [];
    });

export const normalizeEndpoints = (
    document: DocumentNode,
    root: DocumentNode,
    responseOrder: ResponseOrder,
): ApiSpecEndpoint[] => {
    const securitySchemes = asNode(asNode(document['components'])?.['securitySchemes']);
    return Object.entries(asNode(document['paths']) ?? {}).flatMap(([path, value]) => {
        const pathItem = asNode(value);
        if (!pathItem || isExtensionKey(path)) {
            return [];
        }
        return pathEndpoints({
            path,
            pathItem,
            root,
            rootSecurity: document['security'],
            securitySchemes,
            responseOrder,
        });
    });
};
