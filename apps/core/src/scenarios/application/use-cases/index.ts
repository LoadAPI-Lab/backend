import type { Provider } from '@nestjs/common';

import { CreateScenarioUseCase } from './create-scenario.use-case';
import { DeleteScenarioUseCase } from './delete-scenario.use-case';
import { GetScenarioUseCase } from './get-scenario.use-case';
import { ListScenariosUseCase } from './list-scenarios.use-case';
import { ReplaceScenarioUseCase } from './replace-scenario.use-case';

export * from './create-scenario.use-case';
export * from './delete-scenario.use-case';
export * from './get-scenario.use-case';
export * from './list-scenarios.use-case';
export * from './replace-scenario.use-case';

export const USE_CASES: Provider[] = [
    CreateScenarioUseCase,
    ListScenariosUseCase,
    GetScenarioUseCase,
    ReplaceScenarioUseCase,
    DeleteScenarioUseCase,
];
