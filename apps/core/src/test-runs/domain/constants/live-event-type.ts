export const LiveEventType = {
    SNAPSHOT: 'snapshot',
    STATUS: 'status',
} as const;
export type LiveEventType = (typeof LiveEventType)[keyof typeof LiveEventType];
