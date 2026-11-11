export const RequestOutcomeKind = {
    RESPONSE: 'response',
    ERROR: 'error',
} as const;
export type RequestOutcomeKind = (typeof RequestOutcomeKind)[keyof typeof RequestOutcomeKind];

export const REQUEST_OUTCOME_KINDS = [
    RequestOutcomeKind.RESPONSE,
    RequestOutcomeKind.ERROR,
] as const;
