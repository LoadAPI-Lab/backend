import { httpRequestSchema } from '@shared/http-request';

import { REQUEST_BODY_FIELD, REQUEST_HEADERS_FIELD } from '../constants';
import { REQUEST_BODY_VIOLATION_MESSAGES, REQUEST_HEADER_VIOLATION_MESSAGES } from '../errors';
import { findRequestBodyViolation, findRequestHeaderViolations } from '../validation';

export const outgoingRequestSchema = httpRequestSchema.superRefine((request, ctx) => {
    for (const { headerName, violation } of findRequestHeaderViolations(request)) {
        ctx.addIssue({
            code: 'custom',
            path: [REQUEST_HEADERS_FIELD, headerName],
            message: REQUEST_HEADER_VIOLATION_MESSAGES[violation](headerName),
        });
    }

    const violation = findRequestBodyViolation(request);
    if (violation !== undefined) {
        ctx.addIssue({
            code: 'custom',
            path: [REQUEST_BODY_FIELD],
            message: REQUEST_BODY_VIOLATION_MESSAGES[violation],
        });
    }
});
