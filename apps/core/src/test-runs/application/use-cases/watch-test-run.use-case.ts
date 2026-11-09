import { Injectable, Logger } from '@nestjs/common';
import {
    concat,
    concatMap,
    defer,
    filter,
    finalize,
    from,
    type Observable,
    of,
    ReplaySubject,
} from 'rxjs';

import { LiveEventType } from '../../domain/constants';
import { TestRunErrorCodes, testRunException } from '../../domain/errors';
import { type LiveEvent, LiveFeed, SnapshotHistory } from '../../domain/ports';
import { TestRunsRepository } from '../../domain/repositories';
import { snapshotProgressSchema } from '../../domain/schemas';
import type { TestRun } from '../../domain/test-run';

const readElapsedSeconds = (snapshot: unknown): number | undefined => {
    const parsed = snapshotProgressSchema.safeParse(snapshot);
    if (!parsed.success) {
        return undefined;
    }

    return parsed.data.elapsedSeconds;
};

const lastElapsedSeconds = (history: unknown[]): number | undefined => {
    for (const snapshot of [...history].reverse()) {
        const elapsedSeconds = readElapsedSeconds(snapshot);
        if (elapsedSeconds !== undefined) {
            return elapsedSeconds;
        }
    }

    return undefined;
};

const toSnapshotEvent = (data: unknown): LiveEvent => ({ type: LiveEventType.SNAPSHOT, data });

const isAfterHistory =
    (lastHistoryElapsedSeconds: number | undefined) =>
    (event: LiveEvent): boolean => {
        if (event.type !== LiveEventType.SNAPSHOT || lastHistoryElapsedSeconds === undefined) {
            return true;
        }

        const elapsedSeconds = readElapsedSeconds(event.data);
        return elapsedSeconds === undefined || elapsedSeconds > lastHistoryElapsedSeconds;
    };

@Injectable()
export class WatchTestRunUseCase {
    private readonly logger = new Logger(WatchTestRunUseCase.name);

    constructor(
        private readonly repository: TestRunsRepository,
        private readonly liveFeed: LiveFeed,
        private readonly snapshotHistory: SnapshotHistory,
    ) {}

    async execute(id: string, userId: string): Promise<Observable<LiveEvent>> {
        await this.loadRun(id, userId);

        return defer(() => {
            const buffer = new ReplaySubject<LiveEvent>();
            const feedSubscription = this.liveFeed.watch(id).subscribe(buffer);

            return from(this.loadRunWithHistory(id, userId)).pipe(
                concatMap(({ run, history }) => {
                    const currentStatus = of<LiveEvent>({
                        type: LiveEventType.STATUS,
                        data: { status: run.status, reason: run.reason },
                    });
                    const historySnapshots = from(history.map(toSnapshotEvent));

                    if (run.isFinal()) {
                        return concat(historySnapshots, currentStatus);
                    }

                    const isNewSnapshot = isAfterHistory(lastElapsedSeconds(history));

                    return concat(
                        currentStatus,
                        historySnapshots,
                        buffer.pipe(filter(isNewSnapshot)),
                    );
                }),
                finalize(() => feedSubscription.unsubscribe()),
            );
        });
    }

    private async loadRunWithHistory(
        id: string,
        userId: string,
    ): Promise<{ run: TestRun; history: unknown[] }> {
        const run = await this.loadRun(id, userId);
        const history = await this.readHistory(id);

        return { run, history };
    }

    private async readHistory(id: string): Promise<unknown[]> {
        try {
            return await this.snapshotHistory.read(id);
        } catch {
            this.logger.warn(`Failed to read the snapshot history of test ${id}`);
            return [];
        }
    }

    private async loadRun(id: string, userId: string): Promise<TestRun> {
        const run = await this.repository.findByIdForUser(id, userId);

        if (!run) {
            throw testRunException(TestRunErrorCodes.NOT_FOUND);
        }

        return run;
    }
}
