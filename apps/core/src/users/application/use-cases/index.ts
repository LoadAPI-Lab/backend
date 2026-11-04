import type { Provider } from '@nestjs/common';

import { CreateUserUseCase } from './create-user.use-case';
import { FindUserByEmailQuery } from './find-user-by-email.use-case';
import { GetCurrentUserUseCase } from './get-current-user.use-case';
import { GetUserByIdQuery } from './get-user-by-id.use-case';

export * from './create-user.use-case';
export * from './find-user-by-email.use-case';
export * from './get-current-user.use-case';
export * from './get-user-by-id.use-case';

export const USE_CASES: Provider[] = [
    CreateUserUseCase,
    FindUserByEmailQuery,
    GetCurrentUserUseCase,
    GetUserByIdQuery,
];
