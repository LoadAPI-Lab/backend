import { User } from '../../../domain/user';
import type { users } from '../models';

type UserRow = typeof users.$inferSelect;
type UserInsert = typeof users.$inferInsert;

export function toDomainUser(row: UserRow): User {
    return User.restore({
        id: row.id,
        email: row.email,
        name: row.name,
        avatarUrl: row.avatarUrl ?? undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    });
}

export function toUserRow(user: User): UserInsert {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}
