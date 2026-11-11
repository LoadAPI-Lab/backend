import type { HttpRequest } from '@shared/http-request';

import { FORBIDDEN_REQUEST_HEADERS } from '../constants';
import { RequestHeaderViolation } from '../errors';

const HTTP_TOKEN_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const FORBIDDEN_VALUE_CHARACTERS_RE = /[\r\n\0]/;
const FORBIDDEN_HEADER_NAMES: ReadonlySet<string> = new Set(FORBIDDEN_REQUEST_HEADERS);

export interface RequestHeaderViolationEntry {
    readonly headerName: string;
    readonly violation: RequestHeaderViolation;
}

function findHeaderViolation(name: string, value: string): RequestHeaderViolation | undefined {
    if (!HTTP_TOKEN_RE.test(name)) {
        return RequestHeaderViolation.INVALID_NAME;
    }
    if (FORBIDDEN_HEADER_NAMES.has(name.toLowerCase())) {
        return RequestHeaderViolation.FORBIDDEN;
    }
    if (FORBIDDEN_VALUE_CHARACTERS_RE.test(value)) {
        return RequestHeaderViolation.INVALID_VALUE;
    }
    return undefined;
}

export function findRequestHeaderViolations(
    request: Pick<HttpRequest, 'headers'>,
): RequestHeaderViolationEntry[] {
    return Object.entries(request.headers ?? {}).flatMap(([headerName, value]) => {
        const violation = findHeaderViolation(headerName, value);
        return violation === undefined ? [] : [{ headerName, violation }];
    });
}
