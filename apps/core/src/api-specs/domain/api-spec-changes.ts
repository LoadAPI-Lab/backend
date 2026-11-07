import { isDeepStrictEqual } from 'node:util';

import type { ApiSpecEndpoint } from './api-spec-document';

export interface ApiSpecChanges {
    readonly added: string[];
    readonly changed: string[];
    readonly removed: string[];
}

type ComparedEndpointFields = Pick<ApiSpecEndpoint, 'parameters' | 'requestBody' | 'responses'>;

const comparedFields = ({
    parameters,
    requestBody,
    responses,
}: ApiSpecEndpoint): ComparedEndpointFields => ({ parameters, requestBody, responses });

const byKey = (endpoints: ApiSpecEndpoint[]): Map<string, ApiSpecEndpoint> =>
    new Map(endpoints.map((endpoint) => [endpoint.key, endpoint]));

export const summarizeEndpointChanges = (
    previous: ApiSpecEndpoint[],
    next: ApiSpecEndpoint[],
): ApiSpecChanges => {
    const previousByKey = byKey(previous);
    const nextByKey = byKey(next);
    const added: string[] = [];
    const changed: string[] = [];

    for (const endpoint of nextByKey.values()) {
        const before = previousByKey.get(endpoint.key);
        if (!before) {
            added.push(endpoint.key);
        } else if (!isDeepStrictEqual(comparedFields(before), comparedFields(endpoint))) {
            changed.push(endpoint.key);
        }
    }

    const removed = [...previousByKey.keys()].filter((key) => !nextByKey.has(key));

    return { added, changed, removed };
};
