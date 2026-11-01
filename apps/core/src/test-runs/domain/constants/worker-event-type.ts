export const WorkerEventType = {
    STARTED: 'started',
    FINISHED: 'finished',
} as const;
export type WorkerEventType = (typeof WorkerEventType)[keyof typeof WorkerEventType];
