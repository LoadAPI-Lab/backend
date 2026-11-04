import { Identity } from '../../../domain/identity';
import type { userIdentities } from '../models';

type IdentityRow = typeof userIdentities.$inferSelect;
type IdentityInsert = typeof userIdentities.$inferInsert;

export function toDomainIdentity(row: IdentityRow): Identity {
    return Identity.restore({
        id: row.id,
        userId: row.userId,
        provider: row.provider,
        providerUserId: row.providerUserId,
        createdAt: row.createdAt,
    });
}

export function toIdentityRow(identity: Identity): IdentityInsert {
    return {
        id: identity.id,
        userId: identity.userId,
        provider: identity.provider,
        providerUserId: identity.providerUserId,
        createdAt: identity.createdAt,
    };
}
