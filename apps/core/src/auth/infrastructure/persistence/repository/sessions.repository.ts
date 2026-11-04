import { DATABASE_SERVICE, type DatabaseService } from '@libs/database';
import { Inject, Injectable } from '@nestjs/common';
import * as schema from '@shared/entities';
import { and, eq, isNull } from 'drizzle-orm';

import { SessionsRepository } from '../../../domain/repositories';
import type { Session } from '../../../domain/session';
import { toDomainSession, toSessionRow } from '../mappers';
import { sessions } from '../models';

const SINGLE_ROW_LIMIT = 1;

@Injectable()
export class SessionsRepositoryImpl implements SessionsRepository {
    constructor(
        @Inject(DATABASE_SERVICE)
        private readonly db: DatabaseService<typeof schema>,
    ) {}

    async create(session: Session): Promise<void> {
        await this.db.insert(sessions).values(toSessionRow(session));
    }

    async findById(id: string): Promise<Session | null> {
        const [row] = await this.db
            .select()
            .from(sessions)
            .where(eq(sessions.id, id))
            .limit(SINGLE_ROW_LIMIT);
        if (!row) {
            return null;
        }
        return toDomainSession(row);
    }

    async updateIfRefreshJti(session: Session, expectedJti: string): Promise<boolean> {
        const updated = await this.db
            .update(sessions)
            .set({
                refreshJti: session.refreshJti,
                expiresAt: session.expiresAt,
                updatedAt: session.updatedAt,
            })
            .where(
                and(
                    eq(sessions.id, session.id),
                    eq(sessions.refreshJti, expectedJti),
                    isNull(sessions.revokedAt),
                ),
            )
            .returning({ id: sessions.id });
        return Boolean(updated.length);
    }

    async revoke(id: string, at: Date): Promise<void> {
        await this.db
            .update(sessions)
            .set({ revokedAt: at, updatedAt: at })
            .where(and(eq(sessions.id, id), isNull(sessions.revokedAt)));
    }
}
