import { Injectable } from '@nestjs/common';

import { TestRunErrorCodes, testRunException } from '../../domain/errors';
import { type TestRunPageCursor, TestRunsRepository } from '../../domain/repositories';
import type { ListTestRunsQueryDto, ListTestRunsResponse } from '../dtos';
import { toTestRunListItem } from '../mappers';
import { decodeTestRunCursor, encodeTestRunCursor } from '../pagination';

const PAGE_START = 0;
const LAST_ITEM = -1;

const decodeCursorOrThrow = (encoded: string): TestRunPageCursor => {
    const cursor = decodeTestRunCursor(encoded);

    if (!cursor) {
        throw testRunException(TestRunErrorCodes.INVALID_CURSOR);
    }

    return cursor;
};

@Injectable()
export class ListTestRunsUseCase {
    constructor(private readonly repository: TestRunsRepository) {}

    async execute(
        { limit, cursor, status, type }: ListTestRunsQueryDto,
        userId: string,
    ): Promise<ListTestRunsResponse> {
        const runs = await this.repository.findPage({
            userId,
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
