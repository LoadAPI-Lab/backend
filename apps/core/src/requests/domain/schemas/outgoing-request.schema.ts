import { httpRequestSchema } from '@shared/http-request';

import { REQUEST_BODY_FIELD } from '../constants';
import { REQUEST_BODY_VIOLATION_MESSAGES } from '../errors';
import { findRequestBodyViolation } from '../validation';

export const outgoingRequestSchema = httpRequestSchema.superRefine((request, ctx) => {
    const violation = findRequestBodyViolation(request);
    if (violation !== undefined) {
        ctx.addIssue({
            code: 'custom',
            path: [REQUEST_BODY_FIELD],
            message: REQUEST_BODY_VIOLATION_MESSAGES[violation],
        });
    }
});
