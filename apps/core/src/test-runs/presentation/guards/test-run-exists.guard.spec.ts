import type { ExecutionContext } from '@nestjs/common';
import { isBaseExceptionWithCode } from '@shared/error';
import type { FastifyRequest } from 'fastify';

import { GetTestRunUseCase } from '../../application/use-cases';
import { HttpMethod, TestRunStatus, TestType } from '../../domain/constants';
import { TestRunErrorCodes } from '../../domain/errors';
import { TestRun } from '../../domain/test-run';
import { InMemoryTestRunsRepository } from '../../testing';
import { TestRunExistsGuard } from './test-run-exists.guard';

const TEST_ID = 'b3f1c2d4-7a1e-4f0b-9c3a-2e8d5f6a7b90';
const OWNER_ID = '5d7e9a10-3c4b-4e2f-8a1d-6b9c0e2f4a13';
const OTHER_USER_ID = 'e1a2b3c4-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const SESSION_ID = '9a2b3c4d-7a1e-4f0b-9c3a-2e8d5f6a7b90';

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

const contextFor = (userId: string) =>
    ({
        switchToHttp: () => ({
            getRequest: (): Partial<FastifyRequest> => ({
                params: { id: TEST_ID },
                user: { id: userId, sessionId: SESSION_ID },
            }),
        }),
    }) as unknown as ExecutionContext;

const isNotFound = (error: unknown) => isBaseExceptionWithCode(error, TestRunErrorCodes.NOT_FOUND);

describe('TestRunExistsGuard', () => {
    let guard: TestRunExistsGuard;

    beforeEach(() => {
        const repository = new InMemoryTestRunsRepository().seed(storedRun());
        guard = new TestRunExistsGuard(new GetTestRunUseCase(repository));
    });

    it('lets the owner open the stream of their run', async () => {
        const context = contextFor(OWNER_ID);

        await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it("rejects another user's run as not found", async () => {
        const context = contextFor(OTHER_USER_ID);

        await expect(guard.canActivate(context)).rejects.toSatisfy(isNotFound);
    });
});
