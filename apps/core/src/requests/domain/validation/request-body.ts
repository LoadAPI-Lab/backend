import { HttpMethod } from '@shared/constants';
import type { HttpRequest } from '@shared/http-request';

import { MAX_REQUEST_BODY_BYTES } from '../constants';
import { RequestBodyViolation } from '../errors';

const METHODS_WITHOUT_BODY: ReadonlySet<HttpMethod> = new Set([HttpMethod.GET, HttpMethod.HEAD]);

export function findRequestBodyViolation(
    request: Pick<HttpRequest, 'method' | 'body'>,
): RequestBodyViolation | undefined {
    if (request.body === undefined) {
        return undefined;
    }
    if (METHODS_WITHOUT_BODY.has(request.method)) {
        return RequestBodyViolation.NOT_ALLOWED;
    }
    if (Buffer.byteLength(request.body, 'utf8') > MAX_REQUEST_BODY_BYTES) {
        return RequestBodyViolation.TOO_LARGE;
    }
    return undefined;
}
