import { DATABASE_SERVICE, type DatabaseService } from '@libs/database';
import { Inject, Injectable } from '@nestjs/common';
import * as schema from '@shared/entities';
import { and, desc, eq } from 'drizzle-orm';

import type { ApiSpec, ApiSpecSummary } from '../../../domain/api-spec';
import { ApiSpecsRepository, type RenameApiSpecInput } from '../../../domain/repositories';
import { toApiSpecRow, toDomainApiSpec } from '../mappers';
import { apiSpecs } from '../models';

const SINGLE_ROW_LIMIT = 1;

const SUMMARY_COLUMNS = {
    id: apiSpecs.id,
    name: apiSpecs.name,
    title: apiSpecs.title,
    version: apiSpecs.version,
    endpointsCount: apiSpecs.endpointsCount,
    createdAt: apiSpecs.createdAt,
};

const ownedBy = (id: string, userId: string) =>
    and(eq(apiSpecs.id, id), eq(apiSpecs.userId, userId));

@Injectable()
export class ApiSpecsRepositoryImpl implements ApiSpecsRepository {
    constructor(
        @Inject(DATABASE_SERVICE)
        private readonly db: DatabaseService<typeof schema>,
    ) {}

    async create(spec: ApiSpec): Promise<void> {
        await this.db.insert(apiSpecs).values(toApiSpecRow(spec));
    }

    async findByIdForUser(id: string, userId: string): Promise<ApiSpec | null> {
        const [row] = await this.db
            .select()
            .from(apiSpecs)
            .where(ownedBy(id, userId))
            .limit(SINGLE_ROW_LIMIT);
        return row ? toDomainApiSpec(row) : null;
    }

    listForUser(userId: string): Promise<ApiSpecSummary[]> {
        return this.db
            .select(SUMMARY_COLUMNS)
            .from(apiSpecs)
            .where(eq(apiSpecs.userId, userId))
            .orderBy(desc(apiSpecs.createdAt), desc(apiSpecs.id));
    }

    async updateName({
        id,
        userId,
        name,
        updatedAt,
    }: RenameApiSpecInput): Promise<ApiSpecSummary | null> {
        const [row] = await this.db
            .update(apiSpecs)
            .set({ name, updatedAt })
            .where(ownedBy(id, userId))
            .returning(SUMMARY_COLUMNS);
        return row ?? null;
    }

    async deleteForUser(id: string, userId: string): Promise<boolean> {
        const deleted = await this.db
            .delete(apiSpecs)
            .where(ownedBy(id, userId))
            .returning({ id: apiSpecs.id });
        return Boolean(deleted.length);
    }
}
