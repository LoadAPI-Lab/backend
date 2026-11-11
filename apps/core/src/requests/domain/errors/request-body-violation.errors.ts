import { MAX_REQUEST_BODY_BYTES } from '../constants';

export const RequestBodyViolation = {
    NOT_ALLOWED: 'body_not_allowed',
    TOO_LARGE: 'body_too_large',
} as const;
export type RequestBodyViolation = (typeof RequestBodyViolation)[keyof typeof RequestBodyViolation];

export const REQUEST_BODY_VIOLATION_MESSAGES: Record<RequestBodyViolation, string> = {
    [RequestBodyViolation.NOT_ALLOWED]: 'body is not allowed for GET and HEAD requests',
    [RequestBodyViolation.TOO_LARGE]: `body must be at most ${MAX_REQUEST_BODY_BYTES} bytes in UTF-8`,
};
