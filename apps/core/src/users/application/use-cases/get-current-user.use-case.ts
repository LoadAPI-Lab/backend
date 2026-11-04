import { HttpStatus, Injectable } from '@nestjs/common';
import { BaseException } from '@shared/error';

import { UserErrorCodes, UserErrorMessages } from '../../domain/errors';
import { UsersRepository } from '../../domain/repositories';
import type { User } from '../../domain/user';
import type { CurrentUserResponse } from '../dtos';

const toCurrentUserResponse = (user: User): CurrentUserResponse => ({
    id: user.id,
    email: user.email,
    name: user.name,
    ...(user.avatarUrl !== undefined && { avatarUrl: user.avatarUrl }),
    createdAt: user.createdAt.toISOString(),
});

@Injectable()
export class GetCurrentUserUseCase {
    constructor(private readonly repository: UsersRepository) {}

    async execute(userId: string): Promise<CurrentUserResponse> {
        const user = await this.repository.findById(userId);

        if (!user) {
            throw new BaseException(
                {
                    code: UserErrorCodes.NOT_FOUND,
                    message: UserErrorMessages[UserErrorCodes.NOT_FOUND],
                },
                HttpStatus.NOT_FOUND,
            );
        }

        return toCurrentUserResponse(user);
    }
}
