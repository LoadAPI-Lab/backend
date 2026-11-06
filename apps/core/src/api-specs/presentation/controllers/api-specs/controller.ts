import { Body, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBaseController, CurrentUser, SkipContract } from '@shared/decorators';
import { RouteBodyLimit } from '@shared/http';
import type { AuthenticatedUser } from '@shared/types';

import {
    ApiSpecParamsDto,
    type ApiSpecResponse,
    type ApiSpecSummaryResponse,
    ImportApiSpecDto,
    RenameApiSpecDto,
} from '../../../application/dtos';
import {
    DeleteApiSpecUseCase,
    GetApiSpecUseCase,
    ImportApiSpecUseCase,
    ListApiSpecsUseCase,
    RenameApiSpecUseCase,
} from '../../../application/use-cases';
import {
    DeleteApiSpecSwagger,
    GetApiSpecSwagger,
    ImportApiSpecSwagger,
    ListApiSpecsSwagger,
    RenameApiSpecSwagger,
} from './swagger';

const IMPORT_BODY_LIMIT_BYTES = 6_291_456;

@ApiBaseController('api-specs', 'API specs')
export class ApiSpecsController {
    constructor(
        private readonly importApiSpec: ImportApiSpecUseCase,
        private readonly listApiSpecs: ListApiSpecsUseCase,
        private readonly getApiSpec: GetApiSpecUseCase,
        private readonly renameApiSpec: RenameApiSpecUseCase,
        private readonly deleteApiSpec: DeleteApiSpecUseCase,
    ) {}

    @Post()
    @RouteBodyLimit(IMPORT_BODY_LIMIT_BYTES)
    @ImportApiSpecSwagger()
    import(
        @Body() dto: ImportApiSpecDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<ApiSpecResponse> {
        return this.importApiSpec.execute(dto, user.id);
    }

    @Get()
    @ListApiSpecsSwagger()
    list(@CurrentUser() user: AuthenticatedUser): Promise<ApiSpecSummaryResponse[]> {
        return this.listApiSpecs.execute(user.id);
    }

    @Get(':id')
    @GetApiSpecSwagger()
    get(
        @Param() params: ApiSpecParamsDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<ApiSpecResponse> {
        return this.getApiSpec.execute(params.id, user.id);
    }

    @Patch(':id')
    @RenameApiSpecSwagger()
    rename(
        @Param() params: ApiSpecParamsDto,
        @Body() dto: RenameApiSpecDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<ApiSpecSummaryResponse> {
        return this.renameApiSpec.execute(params.id, dto.name, user.id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @SkipContract()
    @DeleteApiSpecSwagger()
    delete(
        @Param() params: ApiSpecParamsDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<void> {
        return this.deleteApiSpec.execute(params.id, user.id);
    }
}
