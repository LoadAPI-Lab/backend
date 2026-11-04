import { Session } from '../../../domain/session';
import type { sessions } from '../models';

type SessionRow = typeof sessions.$inferSelect;
type SessionInsert = typeof sessions.$inferInsert;

export function toDomainSession(row: SessionRow): Session {
    return Session.restore({
        id: row.id,
        userId: row.userId,
        refreshJti: row.refreshJti,
        expiresAt: row.expiresAt,
        revokedAt: row.revokedAt ?? undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    });
}

export function toSessionRow(session: Session): SessionInsert {
    return {
        id: session.id,
        userId: session.userId,
        refreshJti: session.refreshJti,
        expiresAt: session.expiresAt,
        revokedAt: session.revokedAt ?? null,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
    };
}
