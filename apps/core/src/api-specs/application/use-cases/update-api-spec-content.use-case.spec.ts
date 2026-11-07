import { isBaseExceptionWithCode } from '@shared/error';

import { ApiSpec } from '../../domain/api-spec';
import type { ParsedApiSpec } from '../../domain/api-spec-document';
import { ApiSpecErrorCodes, apiSpecException } from '../../domain/errors';
import type { SpecParser } from '../../domain/ports';
import type { ApiSpecsRepository } from '../../domain/repositories';
import { UpdateApiSpecContentUseCase } from './update-api-spec-content.use-case';

const SPEC_ID = '0b7f4c2e-9a1d-4e3f-8b2c-5d6e7f8a9b01';
const OWNER_ID = '5d7e9a10-3c4b-4e2f-8a1d-6b9c0e2f4a13';
const OTHER_USER_ID = 'e1a2b3c4-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const CREATED_AT = new Date('2026-01-01T00:00:00.000Z');
const CONTENT = 'openapi: 3.1.0';

const PARSED: ParsedApiSpec = {
    title: 'Shop v2',
    version: '2.0.0',
    servers: [],
    endpoints: [],
};

const storedSpec = (): ApiSpec =>
    ApiSpec.restore({
        id: SPEC_ID,
        userId: OWNER_ID,
        name: 'My shop',
        title: 'Shop',
        version: '1.0.0',
        source: 'openapi: 3.0.3',
        servers: [],
        endpoints: [],
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
    });

const setup = () => {
    const spec = storedSpec();
    const repository = {
        findByIdForUser: vi.fn(
            async (id: string, userId: string) =>
                [spec].find((owned) => owned.id === id && owned.userId === userId) ?? null,
        ),
        updateContent: vi.fn(async () => true),
    };
    const parser = { parse: vi.fn(async () => PARSED) };
    const useCase = new UpdateApiSpecContentUseCase(
        parser as unknown as SpecParser,
        repository as unknown as ApiSpecsRepository,
    );
    return { repository, parser, useCase };
};

describe('UpdateApiSpecContentUseCase', () => {
    it('rejects a spec of another user as not found without parsing', async () => {
        const { repository, parser, useCase } = setup();

        await expect(
            useCase.execute(SPEC_ID, { content: CONTENT }, OTHER_USER_ID),
        ).rejects.toSatisfy((error: unknown) =>
            isBaseExceptionWithCode(error, ApiSpecErrorCodes.NOT_FOUND),
        );
        expect(parser.parse).not.toHaveBeenCalled();
        expect(repository.updateContent).not.toHaveBeenCalled();
    });

    it('does not update the spec when parsing fails', async () => {
        const { repository, parser, useCase } = setup();
        parser.parse.mockRejectedValueOnce(apiSpecException(ApiSpecErrorCodes.INVALID));

        await expect(useCase.execute(SPEC_ID, { content: CONTENT }, OWNER_ID)).rejects.toSatisfy(
            (error: unknown) => isBaseExceptionWithCode(error, ApiSpecErrorCodes.INVALID),
        );
        expect(repository.updateContent).not.toHaveBeenCalled();
    });

    it('keeps the current name when no name is given', async () => {
        const { repository, useCase } = setup();

        const response = await useCase.execute(SPEC_ID, { content: CONTENT }, OWNER_ID);

        expect(response).toMatchObject({ id: SPEC_ID, name: 'My shop', title: 'Shop v2' });
        expect(repository.updateContent).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'My shop', source: CONTENT }),
        );
    });

    it('replaces the name when a name is given', async () => {
        const { repository, useCase } = setup();

        const response = await useCase.execute(
            SPEC_ID,
            { name: 'Renamed', content: CONTENT },
            OWNER_ID,
        );

        expect(response).toMatchObject({ id: SPEC_ID, name: 'Renamed' });
        expect(repository.updateContent).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Renamed' }),
        );
    });
});
