import { Injectable } from '@nestjs/common';

import { ApiSpecErrorCodes, apiSpecException } from '../../domain/errors';
import { ApiSpecsRepository } from '../../domain/repositories';
import type { ApiSpecResponse } from '../dtos';
import { toApiSpecResponse } from '../mappers';

@Injectable()
export class GetApiSpecUseCase {
    constructor(private readonly repository: ApiSpecsRepository) {}

    async execute(id: string, userId: string): Promise<ApiSpecResponse> {
        const spec = await this.repository.findByIdForUser(id, userId);

        if (!spec) {
            throw apiSpecException(ApiSpecErrorCodes.NOT_FOUND);
        }

        return toApiSpecResponse(spec);
    }
}
