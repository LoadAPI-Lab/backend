import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IAuthModuleOptions } from '@nestjs/passport';
import { isBaseExceptionWithCode } from '@shared/error';
import type { FastifyReply } from 'fastify';

import { AuthCookieName, AuthCookiePath, OAuthProvider } from '../../domain/constants';
import { OAuthErrorCodes } from '../../domain/errors';
import type { OAuthClientCredentials, OAuthProviderSettings } from '../../domain/ports';
import { AuthCookies } from '../cookies';
import { OAuthGuard } from './oauth.guard';

const NONCE = 'a'.repeat(64);
const OTHER_NONCE = 'b'.repeat(64);

class FakeOAuthProviderSettings implements OAuthProviderSettings {
    credentials(): OAuthClientCredentials {
        return { clientId: 'client-id', clientSecret: 'client-secret' };
    }

    callbackUrl(): string {
        return 'http://localhost:3001/callback';
    }
}

class RecordingOAuthGuard extends OAuthGuard {
    calls: { provider: OAuthProvider; options: IAuthModuleOptions }[] = [];

    protected override async authenticate(
        provider: OAuthProvider,
        options: IAuthModuleOptions,
    ): Promise<boolean> {
        this.calls.push({ provider, options });
        return true;
    }
}

const callbackContext = (cookies: Record<string, string | undefined>, state: string) => {
    const reply = { setCookie: vi.fn(), clearCookie: vi.fn() };
    const request = {
        params: { provider: OAuthProvider.GITHUB },
        query: { code: 'provider-code', state },
        cookies,
    };
    const context = {
        switchToHttp: () => ({ getRequest: () => request, getResponse: () => reply }),
    } as unknown as ExecutionContext;
    return { context, reply: reply as typeof reply & Partial<FastifyReply> };
};

describe('OAuthGuard state check', () => {
    let guard: RecordingOAuthGuard;

    beforeEach(() => {
        guard = new RecordingOAuthGuard(
            new FakeOAuthProviderSettings(),
            new AuthCookies(
                new ConfigService({
                    NODE_ENV: 'test',
                    JWT_ACCESS_EXPIRES_IN: '15m',
                    JWT_REFRESH_EXPIRES_IN: '30d',
                }),
            ),
        );
    });

    it.each([
        { name: 'the state cookie is missing', cookies: {} },
        {
            name: 'the nonce differs',
            cookies: { [AuthCookieName.OAUTH_STATE]: OTHER_NONCE },
        },
    ])('rejects the callback when $name', async ({ cookies }) => {
        const { context, reply } = callbackContext(cookies, NONCE);

        expect(() => guard.canActivate(context)).toThrow(
            expect.toSatisfy((error) =>
                isBaseExceptionWithCode(error, OAuthErrorCodes.STATE_MISMATCH),
            ),
        );

        expect(guard.calls).toEqual([]);
        expect(reply.clearCookie).toHaveBeenCalledWith(
            AuthCookieName.OAUTH_STATE,
            expect.objectContaining({ path: AuthCookiePath.OAUTH_STATE }),
        );
    });

    it('passes an equal nonce to the strategy', async () => {
        const { context, reply } = callbackContext({ [AuthCookieName.OAUTH_STATE]: NONCE }, NONCE);

        await expect(guard.canActivate(context)).resolves.toBe(true);

        expect(guard.calls).toEqual([
            {
                provider: OAuthProvider.GITHUB,
                options: { session: false, property: 'oauthProfile', state: NONCE },
            },
        ]);
        expect(reply.clearCookie).toHaveBeenCalledWith(
            AuthCookieName.OAUTH_STATE,
            expect.objectContaining({ path: AuthCookiePath.OAUTH_STATE }),
        );
    });
});
