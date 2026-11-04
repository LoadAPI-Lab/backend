import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Public } from '@shared/decorators';
import { isBaseExceptionWithCode } from '@shared/error';
import type { FastifyRequest } from 'fastify';

import { AuthCookieName, TokenType } from '../../domain/constants';
import { AuthErrorCodes } from '../../domain/errors';
import type { AccessTokenClaims, TokenPair, TokenService } from '../../domain/ports';
import { AccessTokenGuard } from './access-token.guard';

const VALID_TOKEN = 'valid-access-token';
const USER_ID = '6f1c2d4e-7a1e-4f0b-9c3a-2e8d5f6a7b90';
const SESSION_ID = '9a2b3c4d-7a1e-4f0b-9c3a-2e8d5f6a7b90';

class FakeTokenService implements TokenService {
    async issuePair(): Promise<TokenPair> {
        return { accessToken: '', refreshToken: '' };
    }

    async verifyAccess(token: string): Promise<AccessTokenClaims | null> {
        return token === VALID_TOKEN
            ? { sub: USER_ID, sid: SESSION_ID, typ: TokenType.ACCESS }
            : null;
    }

    async verifyRefresh(): Promise<null> {
        return null;
    }
}

const handler = (isPublic: boolean) => {
    const route = (): void => {};
    return isPublic ? Public()(route) : route;
};

const contextFor = (request: Partial<FastifyRequest>, isPublic = false) =>
    ({
        getHandler: () => handler(isPublic),
        getClass: () => class Controller {},
        switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

const isUnauthenticated = (error: unknown) =>
    isBaseExceptionWithCode(error, AuthErrorCodes.UNAUTHENTICATED);

describe('AccessTokenGuard', () => {
    const guard = new AccessTokenGuard(new Reflector(), new FakeTokenService());

    it('lets a public route through without a cookie', async () => {
        const request: Partial<FastifyRequest> = { cookies: {} };

        await expect(guard.canActivate(contextFor(request, true))).resolves.toBe(true);

        expect(request.user).toBeUndefined();
    });

    it.each([
        { name: 'the cookie is missing', cookies: {} },
        { name: 'the token is invalid', cookies: { [AuthCookieName.ACCESS_TOKEN]: 'forged' } },
    ])('rejects when $name', async ({ cookies }) => {
        const request: Partial<FastifyRequest> = { cookies };

        await expect(guard.canActivate(contextFor(request))).rejects.toSatisfy(isUnauthenticated);

        expect(request.user).toBeUndefined();
    });

    it('sets request.user from a valid token', async () => {
        const request: Partial<FastifyRequest> = {
            cookies: { [AuthCookieName.ACCESS_TOKEN]: VALID_TOKEN },
        };

        await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);

        expect(request.user).toEqual({ id: USER_ID, sessionId: SESSION_ID });
    });
});
