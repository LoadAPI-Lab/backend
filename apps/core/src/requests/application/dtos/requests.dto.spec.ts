import { HttpStatus } from '@nestjs/common';
import { HttpMethod } from '@shared/constants';
import { ZodValidationException, ZodValidationPipe } from 'nestjs-zod';
import type { ZodError } from 'zod/v4';

import { REQUEST_BODY_FIELD } from '../../domain/constants';
import { SendRequestDto } from './requests.dto';

const GET_WITH_BODY = {
    method: HttpMethod.GET,
    url: 'https://api.example.com/users',
    body: '{"name":"Ada"}',
};

describe('SendRequestDto', () => {
    it('rejects a GET request with a body with 400 on the body field', () => {
        const pipe = new ZodValidationPipe();

        let thrown: unknown;
        try {
            pipe.transform(GET_WITH_BODY, { type: 'body', metatype: SendRequestDto });
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(ZodValidationException);
        const exception = thrown as ZodValidationException;
        expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect((exception.getZodError() as ZodError).issues.map((issue) => issue.path)).toEqual([
            [REQUEST_BODY_FIELD],
        ]);
    });
});
