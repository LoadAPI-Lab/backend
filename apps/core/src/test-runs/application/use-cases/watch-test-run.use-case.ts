import { Injectable } from '@nestjs/common';
import { concat, concatMap, defer, finalize, from, type Observable, of, ReplaySubject } from 'rxjs';

import { LiveEventType } from '../../domain/constants';
import { TestRunErrorCodes, testRunException } from '../../domain/errors';
import { type LiveEvent, LiveFeed } from '../../domain/ports';
import { TestRunsRepository } from '../../domain/repositories';
import type { TestRun } from '../../domain/test-run';

@Injectable()
export class WatchTestRunUseCase {
    constructor(
        private readonly repository: TestRunsRepository,
        private readonly liveFeed: LiveFeed,
    ) {}

    async execute(id: string, userId: string): Promise<Observable<LiveEvent>> {
        await this.loadRun(id, userId);

        return defer(() => {
            const buffer = new ReplaySubject<LiveEvent>();
            const feedSubscription = this.liveFeed.watch(id).subscribe(buffer);

            return from(this.loadRun(id, userId)).pipe(
                concatMap((run) => {
                    const currentStatus = of<LiveEvent>({
                        type: LiveEventType.STATUS,
                        data: { status: run.status, reason: run.reason },
                    });

                    return run.isFinal() ? currentStatus : concat(currentStatus, buffer);
                }),
                finalize(() => feedSubscription.unsubscribe()),
            );
        });
    }

    private async loadRun(id: string, userId: string): Promise<TestRun> {
        const run = await this.repository.findByIdForUser(id, userId);

        if (!run) {
            throw testRunException(TestRunErrorCodes.NOT_FOUND);
        }

        return run;
    }
}
