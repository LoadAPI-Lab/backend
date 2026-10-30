import { DATABASE_SERVICE, type DatabaseService } from '@libs/database';
import { Inject, Injectable } from '@nestjs/common';
import * as schema from '@shared/entities';
import { and, eq } from 'drizzle-orm';

import type { TestRunStatus } from '../../../domain/constants';
import { TestRunsRepository } from '../../../domain/repositories';
import type { TestRun } from '../../../domain/test-run';
import { toDomainTestRun, toTestRunRow } from '../mappers';
import { testRuns } from '../models';

const SINGLE_ROW_LIMIT = 1;

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
}
