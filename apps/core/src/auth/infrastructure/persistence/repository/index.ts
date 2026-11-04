import type { Provider } from '@nestjs/common';

import { IdentitiesRepository, SessionsRepository } from '../../../domain/repositories';
import { IdentitiesRepositoryImpl } from './identities.repository';
import { SessionsRepositoryImpl } from './sessions.repository';

export * from './identities.repository';
export * from './sessions.repository';

export const REPOSITORIES: Provider[] = [
    { provide: SessionsRepository, useClass: SessionsRepositoryImpl },
    { provide: IdentitiesRepository, useClass: IdentitiesRepositoryImpl },
];
