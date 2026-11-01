import { HttpStatus, Injectable } from '@nestjs/common';
import { BaseException } from '@shared/error';
import { concat, concatMap, defer, finalize, from, type Observable, of, ReplaySubject } from 'rxjs';

import { LiveEventType } from '../../domain/constants';
import { TestRunErrorCodes, TestRunErrorMessages } from '../../domain/errors';
import { type LiveEvent, LiveFeed } from '../../domain/ports';
import { TestRunsRepository } from '../../domain/repositories';
import type { TestRun } from '../../domain/test-run';

@Injectable()
export class WatchTestRunUseCase {
    constructor(
        private readonly repository: TestRunsRepository,
        private readonly liveFeed: LiveFeed,
    ) {}

    async execute(id: string): Promise<Observable<LiveEvent>> {
        await this.loadRun(id);

        return defer(() => {
            const buffer = new ReplaySubject<LiveEvent>();
            const feedSubscription = this.liveFeed.watch(id).subscribe(buffer);

            return from(this.loadRun(id)).pipe(
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

    private async loadRun(id: string): Promise<TestRun> {
        const run = await this.repository.findById(id);

        if (!run) {
            throw new BaseException(
                {
                    code: TestRunErrorCodes.NOT_FOUND,
                    message: TestRunErrorMessages[TestRunErrorCodes.NOT_FOUND],
                },
                HttpStatus.NOT_FOUND,
            );
        }

        return run;
    }
}
