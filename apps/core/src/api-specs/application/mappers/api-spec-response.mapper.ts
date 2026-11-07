import type { ApiSpec, ApiSpecSummary } from '../../domain/api-spec';
import type { ApiSpecChanges } from '../../domain/api-spec-changes';
import type { ApiSpecResponse, ApiSpecSummaryResponse, UpdatedApiSpecResponse } from '../dtos';

export const toApiSpecResponse = (spec: ApiSpec): ApiSpecResponse => ({
    id: spec.id,
    name: spec.name,
    title: spec.title,
    version: spec.version,
    ...(spec.description !== undefined && { description: spec.description }),
    createdAt: spec.createdAt.toISOString(),
    servers: spec.servers,
    endpoints: spec.endpoints,
});

export const toUpdatedApiSpecResponse = (
    spec: ApiSpec,
    changes: ApiSpecChanges,
): UpdatedApiSpecResponse => ({
    ...toApiSpecResponse(spec),
    changes: {
        added: changes.added,
        changed: changes.changed,
        removed: changes.removed,
    },
});

export const toApiSpecSummaryResponse = (summary: ApiSpecSummary): ApiSpecSummaryResponse => ({
    id: summary.id,
    name: summary.name,
    title: summary.title,
    version: summary.version,
    endpointsCount: summary.endpointsCount,
    createdAt: summary.createdAt.toISOString(),
});
