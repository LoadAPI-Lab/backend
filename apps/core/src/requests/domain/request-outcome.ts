import type { RequestOutcomeKind, SendErrorCategory } from './constants';

export interface ResponseHeader {
    readonly name: string;
    readonly value: string;
}

export interface ReceivedResponse {
    readonly kind: typeof RequestOutcomeKind.RESPONSE;
    readonly status: number;
    readonly statusText?: string;
    readonly headers: readonly ResponseHeader[];
    readonly body?: string;
    readonly binary?: true;
    readonly bodyTruncated?: true;
    readonly sizeBytes: number;
    readonly durationMs: number;
}

export interface SendError {
    readonly category: SendErrorCategory;
    readonly message: string;
}

export interface FailedRequest {
    readonly kind: typeof RequestOutcomeKind.ERROR;
    readonly durationMs: number;
    readonly error: SendError;
}

export type RequestOutcome = ReceivedResponse | FailedRequest;
