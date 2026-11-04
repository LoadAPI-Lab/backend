import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isBaseExceptionWithCode } from '@shared/error';

import { AuthErrorCodes } from '../../domain/errors';
import { OriginGuard } from './origin.guard';

const FRONTEND_ORIGIN = 'http://localhost:3000';
const OWN_ORIGIN = 'http://localhost:3001';
const FOREIGN_ORIGIN = 'https://evil.example.com';

const contextFor = (method: string, origin?: string) =>
    ({
        switchToHttp: () => ({
            getRequest: () => ({ method, headers: origin === undefined ? {} : { origin } }),
        }),
    }) as unknown as ExecutionContext;

describe('OriginGuard', () => {
    const guard = new OriginGuard(
        new ConfigService({ CORS_ALLOWED_ORIGINS: [FRONTEND_ORIGIN], PORT: 3001 }),
    );

    it.each([
        { name: 'a GET from a foreign origin', method: 'GET', origin: FOREIGN_ORIGIN },
        { name: 'a POST from an allowed origin', method: 'POST', origin: FRONTEND_ORIGIN },
        { name: 'a POST from the API origin', method: 'POST', origin: OWN_ORIGIN },
        { name: 'a POST without an origin', method: 'POST', origin: undefined },
    ])('allows $name', ({ method, origin }) => {
        expect(guard.canActivate(contextFor(method, origin))).toBe(true);
    });

    it('rejects a POST from a foreign origin', () => {
        expect(() => guard.canActivate(contextFor('POST', FOREIGN_ORIGIN))).toThrow(
            expect.toSatisfy((error) =>
                isBaseExceptionWithCode(error, AuthErrorCodes.ORIGIN_NOT_ALLOWED),
            ),
        );
    });
});
