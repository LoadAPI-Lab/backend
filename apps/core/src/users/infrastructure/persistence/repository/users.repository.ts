import { DATABASE_SERVICE, type DatabaseService } from '@libs/database';
import { Inject, Injectable } from '@nestjs/common';
import * as schema from '@shared/entities';
import { eq } from 'drizzle-orm';

import { UsersRepository } from '../../../domain/repositories';
import { normalizeEmail, type User } from '../../../domain/user';
import { toDomainUser, toUserRow } from '../mappers';
import { users } from '../models';

const SINGLE_ROW_LIMIT = 1;

@Injectable()
export class UsersRepositoryImpl implements UsersRepository {
    constructor(
        @Inject(DATABASE_SERVICE)
        private readonly db: DatabaseService<typeof schema>,
    ) {}

    async findById(id: string): Promise<User | null> {
        const [row] = await this.db
            .select()
            .from(users)
            .where(eq(users.id, id))
            .limit(SINGLE_ROW_LIMIT);
        if (!row) {
            return null;
        }
        return toDomainUser(row);
    }

    async findByEmail(email: string): Promise<User | null> {
        const [row] = await this.db
            .select()
            .from(users)
            .where(eq(users.email, normalizeEmail(email)))
            .limit(SINGLE_ROW_LIMIT);
        if (!row) {
            return null;
        }
        return toDomainUser(row);
    }

    async create(user: User): Promise<void> {
        await this.db.insert(users).values(toUserRow(user));
    }
}
