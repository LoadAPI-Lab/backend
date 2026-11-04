import { Injectable } from '@nestjs/common';

import { UsersRepository } from '../../domain/repositories';
import { User } from '../../domain/user';

export interface CreateUserCommand {
    readonly email: string;
    readonly name: string;
    readonly avatarUrl?: string;
}

@Injectable()
export class CreateUserUseCase {
    constructor(private readonly repository: UsersRepository) {}

    async execute(command: CreateUserCommand): Promise<User> {
        const user = User.create({
            email: command.email,
            name: command.name,
            avatarUrl: command.avatarUrl,
        });

        await this.repository.create(user);

        return user;
    }
}
