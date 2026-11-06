import type { ApiSpec, ApiSpecSummary } from '../../domain/api-spec';
import type { ApiSpecResponse, ApiSpecSummaryResponse } from '../dtos';

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

export const toApiSpecSummaryResponse = (summary: ApiSpecSummary): ApiSpecSummaryResponse => ({
    id: summary.id,
    name: summary.name,
    title: summary.title,
    version: summary.version,
    endpointsCount: summary.endpointsCount,
    createdAt: summary.createdAt.toISOString(),
});
