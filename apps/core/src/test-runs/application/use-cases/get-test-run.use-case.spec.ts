import { HttpMethod } from '@shared/constants';
import { isBaseExceptionWithCode } from '@shared/error';

import { TestRunStatus, TestType } from '../../domain/constants';
import { TestRunErrorCodes } from '../../domain/errors';
import { TestRun } from '../../domain/test-run';
import { InMemoryTestRunsRepository } from '../../testing';
import { GetTestRunUseCase } from './get-test-run.use-case';

const TEST_ID = 'b3f1c2d4-7a1e-4f0b-9c3a-2e8d5f6a7b90';
const OWNER_ID = '5d7e9a10-3c4b-4e2f-8a1d-6b9c0e2f4a13';
const OTHER_USER_ID = 'e1a2b3c4-5d6e-4f70-8a9b-0c1d2e3f4a5b';

const storedRun = (): TestRun =>
    TestRun.restore({
        id: TEST_ID,
        userId: OWNER_ID,
        type: TestType.SINGLE,
        status: TestRunStatus.RUNNING,
        config: {
            target: { method: HttpMethod.GET, url: 'https://api.example.com/users' },
            targetRps: 10,
            durationSeconds: 10,
        },
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        startedAt: new Date('2026-01-01T00:01:00.000Z'),
    });

const isNotFound = (error: unknown) => isBaseExceptionWithCode(error, TestRunErrorCodes.NOT_FOUND);

describe('GetTestRunUseCase', () => {
    let useCase: GetTestRunUseCase;

    beforeEach(() => {
        useCase = new GetTestRunUseCase(new InMemoryTestRunsRepository().seed(storedRun()));
    });

    it("returns the owner's run without the owner id", async () => {
        const response = await useCase.execute(TEST_ID, OWNER_ID);

        expect(response).toMatchObject({ id: TEST_ID, status: TestRunStatus.RUNNING });
        expect(response).not.toHaveProperty('userId');
    });

    it("rejects another user's run as not found", async () => {
        await expect(useCase.execute(TEST_ID, OTHER_USER_ID)).rejects.toSatisfy(isNotFound);
    });
});
