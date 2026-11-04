import { Get } from '@nestjs/common';
import { ApiBaseController, CurrentUser } from '@shared/decorators';
import type { AuthenticatedUser } from '@shared/types';

import type { CurrentUserResponse } from '../../../application/dtos';
import { GetCurrentUserUseCase } from '../../../application/use-cases';
import { GetCurrentUserSwagger } from './swagger';

@ApiBaseController('users', 'Users')
export class UsersController {
    constructor(private readonly getCurrentUser: GetCurrentUserUseCase) {}

    @Get('me')
    @GetCurrentUserSwagger()
    me(@CurrentUser() user: AuthenticatedUser): Promise<CurrentUserResponse> {
        return this.getCurrentUser.execute(user.id);
    }
}
