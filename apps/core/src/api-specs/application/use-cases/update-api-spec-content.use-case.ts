import { Injectable, Logger } from '@nestjs/common';

import { summarizeEndpointChanges } from '../../domain/api-spec-changes';
import { ApiSpecErrorCodes, apiSpecException } from '../../domain/errors';
import { SpecParser } from '../../domain/ports';
import { ApiSpecsRepository } from '../../domain/repositories';
import type { UpdatedApiSpecResponse } from '../dtos';
import { toUpdatedApiSpecResponse } from '../mappers';

export interface UpdateApiSpecContentCommand {
    readonly name?: string;
    readonly content: string;
}

@Injectable()
export class UpdateApiSpecContentUseCase {
    private readonly logger = new Logger(UpdateApiSpecContentUseCase.name);

    constructor(
        private readonly parser: SpecParser,
        private readonly repository: ApiSpecsRepository,
    ) {}

    async execute(
        id: string,
        command: UpdateApiSpecContentCommand,
        userId: string,
    ): Promise<UpdatedApiSpecResponse> {
        const current = await this.repository.findByIdForUser(id, userId);

        if (!current) {
            throw apiSpecException(ApiSpecErrorCodes.NOT_FOUND);
        }

        const parsed = await this.parser.parse(command.content);
        const updated = current.replaceContent({
            ...parsed,
            name: command.name,
            source: command.content,
        });

        const saved = await this.repository.updateContent(updated);

        if (!saved) {
            throw apiSpecException(ApiSpecErrorCodes.NOT_FOUND);
        }

        const changes = summarizeEndpointChanges(current.endpoints, updated.endpoints);

        this.logger.log({
            message: 'API spec content updated',
            userId,
            specId: updated.id,
            sizeBytes: Buffer.byteLength(command.content, 'utf8'),
            endpointsCount: updated.endpointsCount,
            addedCount: changes.added.length,
            changedCount: changes.changed.length,
            removedCount: changes.removed.length,
        });

        return toUpdatedApiSpecResponse(updated, changes);
    }
}
