import type { Provider } from '@nestjs/common';

import { TestRunsRepository } from '../../../domain/repositories';
import { TestRunsRepositoryImpl } from './test-runs.repository';

export * from './test-runs.repository';

export const REPOSITORIES: Provider[] = [
    { provide: TestRunsRepository, useClass: TestRunsRepositoryImpl },
];
