import { DATABASE_SERVICE, type DatabaseService } from '@libs/database';
import { Inject, Injectable } from '@nestjs/common';
import * as schema from '@shared/entities';
import { and, desc, DrizzleQueryError, eq, inArray, type SQL, sql } from 'drizzle-orm';
import { PostgresError } from 'postgres';

import {
    ACTIVE_STATUSES,
    CreateTestRunOutcome,
    type TestRunStatus,
} from '../../../domain/constants';
import { TestRunsRepository, type TestRunPageQuery } from '../../../domain/repositories';
import type { TestRun } from '../../../domain/test-run';
import { toDomainTestRun, toTestRunRow } from '../mappers';
import { ACTIVE_CONFIG_HASH_UNIQUE_INDEX, testRuns } from '../models';

const SINGLE_ROW_LIMIT = 1;
const NEXT_PAGE_PROBE_ROWS = 1;
const UNIQUE_VIOLATION_CODE = '23505';

const isActiveConfigHashViolation = (error: unknown): boolean => {
    if (!(error instanceof DrizzleQueryError)) {
        return false;
    }

    const { cause } = error;
    return (
        cause instanceof PostgresError &&
        cause.code === UNIQUE_VIOLATION_CODE &&
        cause.constraint_name === ACTIVE_CONFIG_HASH_UNIQUE_INDEX
    );
};

@Injectable()
export class TestRunsRepositoryImpl implements TestRunsRepository {
    constructor(
        @Inject(DATABASE_SERVICE)
        private readonly db: DatabaseService<typeof schema>,
    ) {}

    async create(run: TestRun): Promise<CreateTestRunOutcome> {
        try {
            await this.db.insert(testRuns).values(toTestRunRow(run));
        } catch (error) {
            if (isActiveConfigHashViolation(error)) {
                return CreateTestRunOutcome.DUPLICATE_ACTIVE;
            }
            throw error;
        }
        return CreateTestRunOutcome.CREATED;
    }

    async existsActiveWithConfigHash(userId: string, configHash: string): Promise<boolean> {
        const [row] = await this.db
            .select({ id: testRuns.id })
            .from(testRuns)
            .where(
                and(
                    eq(testRuns.userId, userId),
                    eq(testRuns.configHash, configHash),
                    inArray(testRuns.status, ACTIVE_STATUSES),
                ),
            )
            .limit(SINGLE_ROW_LIMIT);
        return row !== undefined;
    }

    async findById(id: string): Promise<TestRun | null> {
        return this.findOne(eq(testRuns.id, id));
    }

    async findByIdForUser(id: string, userId: string): Promise<TestRun | null> {
        return this.findOne(and(eq(testRuns.id, id), eq(testRuns.userId, userId)));
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

    async findPage({ userId, limit, cursor, status, type }: TestRunPageQuery): Promise<TestRun[]> {
        const rows = await this.db
            .select()
            .from(testRuns)
            .where(
                and(
                    eq(testRuns.userId, userId),
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

    private async findOne(condition: SQL | undefined): Promise<TestRun | null> {
        const [row] = await this.db
            .select()
            .from(testRuns)
            .where(condition)
            .limit(SINGLE_ROW_LIMIT);
        if (!row) {
            return null;
        }
        return toDomainTestRun(row);
    }
}
