import type { Provider } from '@nestjs/common';

import { ApiSpecsRepository } from '../../../domain/repositories';
import { ApiSpecsRepositoryImpl } from './api-specs.repository';

export * from './api-specs.repository';

export const REPOSITORIES: Provider[] = [
    { provide: ApiSpecsRepository, useClass: ApiSpecsRepositoryImpl },
];
