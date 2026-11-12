import { DATABASE_SERVICE, type DatabaseService } from '@libs/database';
import { Inject, Injectable } from '@nestjs/common';
import * as schema from '@shared/entities';
import { and, desc, eq } from 'drizzle-orm';

import { ScenariosRepository, type ReplaceScenarioInput } from '../../../domain/repositories';
import type { Scenario, ScenarioSummary } from '../../../domain/scenario';
import { toDomainScenario, toScenarioReplaceRow, toScenarioRow } from '../mappers';
import { scenarios } from '../models';

const SINGLE_ROW_LIMIT = 1;

const SUMMARY_COLUMNS = {
    id: scenarios.id,
    name: scenarios.name,
    stepsCount: scenarios.stepsCount,
    createdAt: scenarios.createdAt,
    updatedAt: scenarios.updatedAt,
};

const ownedBy = (id: string, userId: string) =>
    and(eq(scenarios.id, id), eq(scenarios.userId, userId));

@Injectable()
export class ScenariosRepositoryImpl implements ScenariosRepository {
    constructor(
        @Inject(DATABASE_SERVICE)
        private readonly db: DatabaseService<typeof schema>,
    ) {}

    async create(scenario: Scenario): Promise<void> {
        await this.db.insert(scenarios).values(toScenarioRow(scenario));
    }

    async findByIdForUser(id: string, userId: string): Promise<Scenario | null> {
        const [row] = await this.db
            .select()
            .from(scenarios)
            .where(ownedBy(id, userId))
            .limit(SINGLE_ROW_LIMIT);
        return row ? toDomainScenario(row) : null;
    }

    listForUser(userId: string): Promise<ScenarioSummary[]> {
        return this.db
            .select(SUMMARY_COLUMNS)
            .from(scenarios)
            .where(eq(scenarios.userId, userId))
            .orderBy(desc(scenarios.createdAt), desc(scenarios.id));
    }

    async replaceForUser(input: ReplaceScenarioInput): Promise<Scenario | null> {
        const [row] = await this.db
            .update(scenarios)
            .set(toScenarioReplaceRow(input))
            .where(ownedBy(input.id, input.userId))
            .returning();
        return row ? toDomainScenario(row) : null;
    }

    async deleteForUser(id: string, userId: string): Promise<boolean> {
        const deleted = await this.db
            .delete(scenarios)
            .where(ownedBy(id, userId))
            .returning({ id: scenarios.id });
        return Boolean(deleted.length);
    }
}
