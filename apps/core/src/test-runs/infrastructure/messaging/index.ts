import type { Provider } from '@nestjs/common';

import { WorkerOrchestrator } from '../../domain/ports';
import { WorkerOrchestratorImpl } from './worker-orchestrator';

export * from './constants';
export * from './worker-orchestrator';

export const MESSAGING_PROVIDERS: Provider[] = [
    { provide: WorkerOrchestrator, useClass: WorkerOrchestratorImpl },
];
