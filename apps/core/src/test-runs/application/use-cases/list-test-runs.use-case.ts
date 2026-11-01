import { HttpStatus, Injectable } from '@nestjs/common';
import { BaseException } from '@shared/error';

import { TestRunErrorCodes, TestRunErrorMessages } from '../../domain/errors';
import { type TestRunPageCursor, TestRunsRepository } from '../../domain/repositories';
import type { TestRun } from '../../domain/test-run';
import type { ListTestRunsQueryDto, ListTestRunsResponse, TestRunListItem } from '../dtos';
import { decodeTestRunCursor, encodeTestRunCursor } from '../pagination';

const PAGE_START = 0;
const LAST_ITEM = -1;

const toTestRunListItem = (run: TestRun): TestRunListItem => ({
    id: run.id,
    type: run.type,
    status: run.status,
    createdAt: run.createdAt.toISOString(),
    ...(run.startedAt !== undefined && { startedAt: run.startedAt.toISOString() }),
    ...(run.finishedAt !== undefined && { finishedAt: run.finishedAt.toISOString() }),
    ...(run.reason !== undefined && { reason: run.reason }),
});

const decodeCursorOrThrow = (encoded: string): TestRunPageCursor => {
    const cursor = decodeTestRunCursor(encoded);

    if (!cursor) {
        throw new BaseException(
            {
                code: TestRunErrorCodes.INVALID_CURSOR,
                message: TestRunErrorMessages[TestRunErrorCodes.INVALID_CURSOR],
            },
            HttpStatus.BAD_REQUEST,
        );
    }

    return cursor;
};

@Injectable()
export class ListTestRunsUseCase {
    constructor(private readonly repository: TestRunsRepository) {}

    async execute({
        limit,
        cursor,
        status,
        type,
    }: ListTestRunsQueryDto): Promise<ListTestRunsResponse> {
        const runs = await this.repository.findPage({
            limit,
            ...(cursor !== undefined && { cursor: decodeCursorOrThrow(cursor) }),
            ...(status !== undefined && { status }),
            ...(type !== undefined && { type }),
        });

        const page = runs.slice(PAGE_START, limit);
        const lastRun = page.at(LAST_ITEM);
        const hasMore = runs.length > limit;

        return {
            items: page.map(toTestRunListItem),
            ...(hasMore &&
                lastRun && {
                    nextCursor: encodeTestRunCursor({
                        createdAt: lastRun.createdAt.toISOString(),
                        id: lastRun.id,
                    }),
                }),
        };
    }
}
