import type { Provider } from '@nestjs/common';

import { ScenariosRepository } from '../../../domain/repositories';
import { ScenariosRepositoryImpl } from './scenarios.repository';

export * from './scenarios.repository';

export const REPOSITORIES: Provider[] = [
    { provide: ScenariosRepository, useClass: ScenariosRepositoryImpl },
];
