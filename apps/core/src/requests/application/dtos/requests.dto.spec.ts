import { HttpStatus } from '@nestjs/common';
import { HttpMethod } from '@shared/constants';
import { ZodValidationException, ZodValidationPipe } from 'nestjs-zod';
import type { ZodError } from 'zod/v4';

import { REQUEST_BODY_FIELD, REQUEST_HEADERS_FIELD } from '../../domain/constants';
import { SendRequestDto } from './requests.dto';

const URL = 'https://api.example.com/users';

const GET_WITH_BODY = {
    method: HttpMethod.GET,
    url: URL,
    body: '{"name":"Ada"}',
};

const HEADER_VALUE_WITH_CRLF = 'secret\r\nX-Injected: 1';

const validateAndCatch = (payload: unknown): ZodValidationException => {
    const pipe = new ZodValidationPipe();

    let thrown: unknown;
    try {
        pipe.transform(payload, { type: 'body', metatype: SendRequestDto });
    } catch (error) {
        thrown = error;
    }

    expect(thrown).toBeInstanceOf(ZodValidationException);
    const exception = thrown as ZodValidationException;
    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    return exception;
};

const issuesOf = (exception: ZodValidationException) =>
    (exception.getZodError() as ZodError).issues;

describe('SendRequestDto', () => {
    it('rejects a GET request with a body with 400 on the body field', () => {
        const exception = validateAndCatch(GET_WITH_BODY);

        expect(issuesOf(exception).map((issue) => issue.path)).toEqual([[REQUEST_BODY_FIELD]]);
    });

    it.each([
        ['a value with CRLF', 'X-Token', HEADER_VALUE_WITH_CRLF],
        ['an invalid name', 'X Token', 'value'],
        ['Content-Length', 'Content-Length', '10'],
    ])('rejects a header with %s with 400 on that header', (_case, name, value) => {
        const exception = validateAndCatch({
            method: HttpMethod.POST,
            url: URL,
            headers: { [name]: value },
        });

        const issues = issuesOf(exception);
        expect(issues.map((issue) => issue.path)).toEqual([[REQUEST_HEADERS_FIELD, name]]);
        const [issue] = issues;
        expect(issue?.message).toContain(name);
        expect(issue?.message).not.toContain(value);
    });
});
