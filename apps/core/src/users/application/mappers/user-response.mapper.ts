import type { User } from '../../domain/user';
import type { CurrentUserResponse } from '../dtos';

export const toCurrentUserResponse = (user: User): CurrentUserResponse => ({
    id: user.id,
    email: user.email,
    name: user.name,
    ...(user.avatarUrl !== undefined && { avatarUrl: user.avatarUrl }),
    createdAt: user.createdAt.toISOString(),
});
