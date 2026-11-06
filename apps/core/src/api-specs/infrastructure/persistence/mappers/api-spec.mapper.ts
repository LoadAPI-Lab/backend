import { ApiSpec } from '../../../domain/api-spec';
import type { apiSpecs } from '../models';

type ApiSpecRow = typeof apiSpecs.$inferSelect;
type ApiSpecInsert = typeof apiSpecs.$inferInsert;

export function toDomainApiSpec(row: ApiSpecRow): ApiSpec {
    return ApiSpec.restore({
        id: row.id,
        userId: row.userId,
        name: row.name,
        title: row.title,
        version: row.version,
        description: row.description ?? undefined,
        source: row.source,
        servers: row.servers,
        endpoints: row.endpoints,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    });
}

export function toApiSpecRow(spec: ApiSpec): ApiSpecInsert {
    return {
        id: spec.id,
        userId: spec.userId,
        name: spec.name,
        title: spec.title,
        version: spec.version,
        description: spec.description ?? null,
        source: spec.source,
        servers: spec.servers,
        endpoints: spec.endpoints,
        endpointsCount: spec.endpointsCount,
        createdAt: spec.createdAt,
        updatedAt: spec.updatedAt,
    };
}
