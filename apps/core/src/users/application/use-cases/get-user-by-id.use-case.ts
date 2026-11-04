import { Injectable } from '@nestjs/common';

import { UserErrorCodes, userException } from '../../domain/errors';
import { UsersRepository } from '../../domain/repositories';
import type { User } from '../../domain/user';

@Injectable()
export class GetUserByIdQuery {
    constructor(private readonly repository: UsersRepository) {}

    async execute(id: string): Promise<User> {
        const user = await this.repository.findById(id);

        if (!user) {
            throw userException(UserErrorCodes.NOT_FOUND);
        }

        return user;
    }
}
