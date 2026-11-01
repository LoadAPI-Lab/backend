import { DATABASE_SERVICE, type DatabaseService } from '@libs/database';
import { Inject, Injectable } from '@nestjs/common';
import * as schema from '@shared/entities';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import { ACTIVE_STATUSES, type TestRunStatus } from '../../../domain/constants';
import { TestRunsRepository, type TestRunPageQuery } from '../../../domain/repositories';
import type { TestRun } from '../../../domain/test-run';
import { toDomainTestRun, toTestRunRow } from '../mappers';
import { testRuns } from '../models';

const SINGLE_ROW_LIMIT = 1;
const NEXT_PAGE_PROBE_ROWS = 1;

@Injectable()
export class TestRunsRepositoryImpl implements TestRunsRepository {
    constructor(
        @Inject(DATABASE_SERVICE)
        private readonly db: DatabaseService<typeof schema>,
    ) {}

    async create(run: TestRun): Promise<void> {
        await this.db.insert(testRuns).values(toTestRunRow(run));
    }

    async findById(id: string): Promise<TestRun | undefined> {
        const [row] = await this.db
            .select()
            .from(testRuns)
            .where(eq(testRuns.id, id))
            .limit(SINGLE_ROW_LIMIT);
        if (!row) {
            return undefined;
        }
        return toDomainTestRun(row);
    }

    async updateIfStatus(run: TestRun, expected: TestRunStatus): Promise<boolean> {
        const row = toTestRunRow(run);
        const updated = await this.db
            .update(testRuns)
            .set({
                status: row.status,
                reason: row.reason,
                result: row.result,
                startedAt: row.startedAt,
                finishedAt: row.finishedAt,
            })
            .where(and(eq(testRuns.id, run.id), eq(testRuns.status, expected)))
            .returning({ id: testRuns.id });
        return Boolean(updated.length);
    }

    async countActive(): Promise<number> {
        return this.db.$count(testRuns, inArray(testRuns.status, ACTIVE_STATUSES));
    }

    async findActive(): Promise<TestRun[]> {
        const rows = await this.db
            .select()
            .from(testRuns)
            .where(inArray(testRuns.status, ACTIVE_STATUSES));
        return rows.map(toDomainTestRun);
    }

    async findPage({ limit, cursor, status, type }: TestRunPageQuery): Promise<TestRun[]> {
        const rows = await this.db
            .select()
            .from(testRuns)
            .where(
                and(
                    cursor &&
                        sql`(${testRuns.createdAt}, ${testRuns.id}) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`,
                    status && eq(testRuns.status, status),
                    type && eq(testRuns.type, type),
                ),
            )
            .orderBy(desc(testRuns.createdAt), desc(testRuns.id))
            .limit(limit + NEXT_PAGE_PROBE_ROWS);
        return rows.map(toDomainTestRun);
    }
}
