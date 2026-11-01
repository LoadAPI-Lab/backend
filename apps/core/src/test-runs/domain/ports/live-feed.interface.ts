import type { Observable } from 'rxjs';

import type { LiveEventType, TestRunStatus } from '../constants';

export type LiveEvent =
    | { type: typeof LiveEventType.SNAPSHOT; data: unknown }
    | { type: typeof LiveEventType.STATUS; data: { status: TestRunStatus; reason?: string } };

export abstract class LiveFeed {
    abstract watch(testId: string): Observable<LiveEvent>;
    abstract publishStatus(testId: string, status: TestRunStatus, reason?: string): void;
}
