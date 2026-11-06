import type { Provider } from '@nestjs/common';

import { DeleteApiSpecUseCase } from './delete-api-spec.use-case';
import { GetApiSpecUseCase } from './get-api-spec.use-case';
import { ImportApiSpecUseCase } from './import-api-spec.use-case';
import { ListApiSpecsUseCase } from './list-api-specs.use-case';
import { RenameApiSpecUseCase } from './rename-api-spec.use-case';

export * from './delete-api-spec.use-case';
export * from './get-api-spec.use-case';
export * from './import-api-spec.use-case';
export * from './list-api-specs.use-case';
export * from './rename-api-spec.use-case';

export const USE_CASES: Provider[] = [
    ImportApiSpecUseCase,
    ListApiSpecsUseCase,
    GetApiSpecUseCase,
    RenameApiSpecUseCase,
    DeleteApiSpecUseCase,
];
