import { z } from 'zod/v4';

import { TEST_TYPES, TestRunStatus, WorkerEventType } from '../../domain/constants';

const eventTimeSchema = z.iso.datetime({ offset: true }).transform((value) => new Date(value));

const eventBaseShape = {
    testId: z.uuid(),
    testType: z.enum(TEST_TYPES),
};

const finishedBaseShape = {
    ...eventBaseShape,
    eventType: z.literal(WorkerEventType.FINISHED),
    startedAt: eventTimeSchema,
    finishedAt: eventTimeSchema,
};

const startedEventSchema = z.object({
    ...eventBaseShape,
    eventType: z.literal(WorkerEventType.STARTED),
    timestamp: eventTimeSchema,
});

const finishedEventSchema = z.discriminatedUnion('status', [
    z.object({
        ...finishedBaseShape,
        status: z.enum([TestRunStatus.COMPLETED, TestRunStatus.STOPPED]),
        result: z.unknown().optional(),
    }),
    z.object({
        ...finishedBaseShape,
        status: z.literal(TestRunStatus.FAILED),
        reason: z.string().trim().min(1),
    }),
]);

export const workerEventSchema = z.discriminatedUnion('eventType', [
    startedEventSchema,
    finishedEventSchema,
]);

export type StartedEvent = z.infer<typeof startedEventSchema>;
export type FinishedEvent = z.infer<typeof finishedEventSchema>;
export type WorkerEvent = z.infer<typeof workerEventSchema>;
