import { isBaseExceptionWithCode } from '@shared/error';

import { ApiSpec, type ApiSpecSummary } from '../../domain/api-spec';
import { ApiSpecErrorCodes } from '../../domain/errors';
import type { ApiSpecsRepository, RenameApiSpecInput } from '../../domain/repositories';
import { DeleteApiSpecUseCase } from './delete-api-spec.use-case';
import { GetApiSpecUseCase } from './get-api-spec.use-case';
import { RenameApiSpecUseCase } from './rename-api-spec.use-case';

const SPEC_ID = '0b7f4c2e-9a1d-4e3f-8b2c-5d6e7f8a9b01';
const OWNER_ID = '5d7e9a10-3c4b-4e2f-8a1d-6b9c0e2f4a13';
const OTHER_USER_ID = 'e1a2b3c4-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const MISSING_SPEC_ID = '7c8d9e0f-1a2b-4c3d-8e4f-5a6b7c8d9e0f';

const storedSpec = (): ApiSpec =>
    ApiSpec.restore({
        id: SPEC_ID,
        userId: OWNER_ID,
        name: 'Shop',
        title: 'Shop',
        version: '1.0.0',
        source: 'openapi: 3.0.3',
        servers: [],
        endpoints: [],
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

class FakeApiSpecsRepository implements ApiSpecsRepository {
    readonly specs: ApiSpec[];
    readonly names = new Map<string, string>();

    constructor(spec: ApiSpec) {
        this.specs = [spec];
    }

    async create(): Promise<void> {}

    async findByIdForUser(id: string, userId: string): Promise<ApiSpec | null> {
        return this.owned(id, userId) ?? null;
    }

    async listForUser(userId: string): Promise<ApiSpecSummary[]> {
        return this.specs.filter((spec) => spec.userId === userId).map((spec) => spec.toSummary());
    }

    async updateName({ id, userId, name }: RenameApiSpecInput): Promise<ApiSpecSummary | null> {
        const spec = this.owned(id, userId);
        if (!spec) {
            return null;
        }
        this.names.set(id, name);
        return { ...spec.toSummary(), name };
    }

    async deleteForUser(id: string, userId: string): Promise<boolean> {
        return this.owned(id, userId) !== undefined;
    }

    private owned(id: string, userId: string): ApiSpec | undefined {
        return this.specs.find((spec) => spec.id === id && spec.userId === userId);
    }
}

interface UseCases {
    readonly get: GetApiSpecUseCase;
    readonly rename: RenameApiSpecUseCase;
    readonly remove: DeleteApiSpecUseCase;
}

const isNotFound = (error: unknown) => isBaseExceptionWithCode(error, ApiSpecErrorCodes.NOT_FOUND);

describe('API spec ownership', () => {
    let repository: FakeApiSpecsRepository;
    let useCases: UseCases;

    beforeEach(() => {
        repository = new FakeApiSpecsRepository(storedSpec());
        useCases = {
            get: new GetApiSpecUseCase(repository),
            rename: new RenameApiSpecUseCase(repository),
            remove: new DeleteApiSpecUseCase(repository),
        };
    });

    it.each([
        {
            name: 'get',
            act: ({ get }: UseCases, id: string, userId: string) => get.execute(id, userId),
        },
        {
            name: 'rename',
            act: ({ rename }: UseCases, id: string, userId: string) =>
                rename.execute(id, 'Renamed', userId),
        },
        {
            name: 'delete',
            act: ({ remove }: UseCases, id: string, userId: string) => remove.execute(id, userId),
        },
    ])('$name rejects specs of other users and missing specs as not found', async ({ act }) => {
        await expect(act(useCases, SPEC_ID, OTHER_USER_ID)).rejects.toSatisfy(isNotFound);
        await expect(act(useCases, MISSING_SPEC_ID, OWNER_ID)).rejects.toSatisfy(isNotFound);
        expect(repository.names.size).toBe(0);
    });

    it("returns the owner's spec without the source", async () => {
        const response = await useCases.get.execute(SPEC_ID, OWNER_ID);

        expect(response).toMatchObject({ id: SPEC_ID, name: 'Shop' });
        expect(response).not.toHaveProperty('source');
        expect(response).not.toHaveProperty('userId');
    });

    it("renames the owner's spec", async () => {
        const response = await useCases.rename.execute(SPEC_ID, 'Renamed', OWNER_ID);

        expect(response).toMatchObject({ id: SPEC_ID, name: 'Renamed', endpointsCount: 0 });
        expect(repository.names.get(SPEC_ID)).toBe('Renamed');
    });
});
