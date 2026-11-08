import { Body, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiBaseController, CurrentUser, SkipContract } from '@shared/decorators';
import { RouteBodyLimit } from '@shared/http';
import type { AuthenticatedUser } from '@shared/types';

import {
    ApiSpecParamsDto,
    type ApiSpecResponse,
    type ApiSpecSummaryResponse,
    ImportApiSpecDto,
    RenameApiSpecDto,
    UpdateApiSpecContentDto,
    type UpdatedApiSpecResponse,
} from '../../../application/dtos';
import {
    DeleteApiSpecUseCase,
    GetApiSpecUseCase,
    ImportApiSpecUseCase,
    ListApiSpecsUseCase,
    RenameApiSpecUseCase,
    UpdateApiSpecContentUseCase,
} from '../../../application/use-cases';
import {
    DeleteApiSpecSwagger,
    GetApiSpecSwagger,
    ImportApiSpecSwagger,
    ListApiSpecsSwagger,
    RenameApiSpecSwagger,
    UpdateApiSpecContentSwagger,
} from './swagger';

const IMPORT_BODY_LIMIT_BYTES = 6_291_456;

@ApiBaseController('api-specs', 'API specs')
export class ApiSpecsController {
    constructor(
        private readonly importApiSpec: ImportApiSpecUseCase,
        private readonly listApiSpecs: ListApiSpecsUseCase,
        private readonly getApiSpec: GetApiSpecUseCase,
        private readonly renameApiSpec: RenameApiSpecUseCase,
        private readonly updateApiSpecContent: UpdateApiSpecContentUseCase,
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

    @Put(':id')
    @RouteBodyLimit(IMPORT_BODY_LIMIT_BYTES)
    @UpdateApiSpecContentSwagger()
    updateContent(
        @Param() params: ApiSpecParamsDto,
        @Body() dto: UpdateApiSpecContentDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<UpdatedApiSpecResponse> {
        return this.updateApiSpecContent.execute(params.id, dto, user.id);
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
