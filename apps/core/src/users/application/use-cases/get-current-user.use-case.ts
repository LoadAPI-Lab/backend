import { Injectable } from '@nestjs/common';

import type { CurrentUserResponse } from '../dtos';
import { toCurrentUserResponse } from '../mappers';
import { GetUserByIdQuery } from './get-user-by-id.use-case';

@Injectable()
export class GetCurrentUserUseCase {
    constructor(private readonly getUserById: GetUserByIdQuery) {}

    async execute(userId: string): Promise<CurrentUserResponse> {
        const user = await this.getUserById.execute(userId);

        return toCurrentUserResponse(user);
    }
}
