import { Injectable } from '@nestjs/common';

import { UsersRepository } from '../../domain/repositories';
import type { User } from '../../domain/user';

@Injectable()
export class FindUserByEmailQuery {
    constructor(private readonly repository: UsersRepository) {}

    execute(email: string): Promise<User | null> {
        return this.repository.findByEmail(email);
    }
}
