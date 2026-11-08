import { Injectable } from '@nestjs/common';

import { ApiSpecErrorCodes, apiSpecException } from '../../domain/errors';
import { ApiSpecsRepository } from '../../domain/repositories';

@Injectable()
export class DeleteApiSpecUseCase {
    constructor(private readonly repository: ApiSpecsRepository) {}

    async execute(id: string, userId: string): Promise<void> {
        const deleted = await this.repository.deleteForUser(id, userId);

        if (!deleted) {
            throw apiSpecException(ApiSpecErrorCodes.NOT_FOUND);
        }
    }
}
