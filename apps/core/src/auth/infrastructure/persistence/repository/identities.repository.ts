import { DATABASE_SERVICE, type DatabaseService } from '@libs/database';
import { Inject, Injectable } from '@nestjs/common';
import * as schema from '@shared/entities';
import { and, eq } from 'drizzle-orm';

import type { OAuthProvider } from '../../../domain/constants';
import type { Identity } from '../../../domain/identity';
import { IdentitiesRepository } from '../../../domain/repositories';
import { toDomainIdentity, toIdentityRow } from '../mappers';
import { userIdentities } from '../models';

const SINGLE_ROW_LIMIT = 1;

@Injectable()
export class IdentitiesRepositoryImpl implements IdentitiesRepository {
    constructor(
        @Inject(DATABASE_SERVICE)
        private readonly db: DatabaseService<typeof schema>,
    ) {}

    async create(identity: Identity): Promise<void> {
        await this.db.insert(userIdentities).values(toIdentityRow(identity));
    }

    async findByProvider(
        provider: OAuthProvider,
        providerUserId: string,
    ): Promise<Identity | null> {
        const [row] = await this.db
            .select()
            .from(userIdentities)
            .where(
                and(
                    eq(userIdentities.provider, provider),
                    eq(userIdentities.providerUserId, providerUserId),
                ),
            )
            .limit(SINGLE_ROW_LIMIT);
        if (!row) {
            return null;
        }
        return toDomainIdentity(row);
    }
}
