import { Injectable, Logger } from '@nestjs/common';

import { ApiSpec } from '../../domain/api-spec';
import { DEFAULT_SPEC_NAME, NAME_MAX_LENGTH } from '../../domain/constants';
import { SpecParser } from '../../domain/ports';
import { ApiSpecsRepository } from '../../domain/repositories';
import type { ApiSpecResponse } from '../dtos';
import { toApiSpecResponse } from '../mappers';

export interface ImportApiSpecCommand {
    readonly name?: string;
    readonly content: string;
}

const defaultName = (title: string): string => {
    const name = [...title.trim()]
        .filter((_character, index) => index < NAME_MAX_LENGTH)
        .join('')
        .trim();
    return name || DEFAULT_SPEC_NAME;
};

@Injectable()
export class ImportApiSpecUseCase {
    private readonly logger = new Logger(ImportApiSpecUseCase.name);

    constructor(
        private readonly parser: SpecParser,
        private readonly repository: ApiSpecsRepository,
    ) {}

    async execute(command: ImportApiSpecCommand, userId: string): Promise<ApiSpecResponse> {
        const parsed = await this.parser.parse(command.content);
        const spec = ApiSpec.create({
            ...parsed,
            userId,
            name: command.name ?? defaultName(parsed.title),
            source: command.content,
        });

        await this.repository.create(spec);

        this.logger.log({
            message: 'API spec imported',
            userId,
            specId: spec.id,
            sizeBytes: Buffer.byteLength(command.content, 'utf8'),
            endpointsCount: spec.endpointsCount,
        });

        return toApiSpecResponse(spec);
    }
}
