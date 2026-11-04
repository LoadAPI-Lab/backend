import type { Provider } from '@nestjs/common';

import { UsersRepository } from '../../../domain/repositories';
import { UsersRepositoryImpl } from './users.repository';

export * from './users.repository';

export const REPOSITORIES: Provider[] = [
    { provide: UsersRepository, useClass: UsersRepositoryImpl },
];
