import { randomBytes, timingSafeEqual } from 'node:crypto';

import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard, type IAuthModuleOptions } from '@nestjs/passport';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { AuthCookieName, isOAuthProvider, type OAuthProvider } from '../../domain/constants';
import { OAuthErrorCodes, oauthException } from '../../domain/errors';
import { OAuthProviderSettings } from '../../domain/ports';
import type { OAuthProfile } from '../../domain/schemas';
import { AuthCookies } from '../cookies';

const NONCE_BYTES = 32;
const OAUTH_PROFILE_PROPERTY = 'oauthProfile';

type OAuthRequest = FastifyRequest<{
    Params: { provider?: string };
    Querystring: { code?: string; state?: string; error?: string };
}>;

export type OAuthCallbackRequest = FastifyRequest & {
    readonly [OAUTH_PROFILE_PROPERTY]: OAuthProfile;
};

const isSameNonce = (expected: string, received: string): boolean => {
    const expectedBytes = Buffer.from(expected);
    const receivedBytes = Buffer.from(received);
    return (
        expectedBytes.length === receivedBytes.length &&
        timingSafeEqual(expectedBytes, receivedBytes)
    );
};

@Injectable()
export class OAuthGuard implements CanActivate {
    constructor(
        private readonly settings: OAuthProviderSettings,
        private readonly cookies: AuthCookies,
    ) {}

    canActivate(context: ExecutionContext): Promise<boolean> {
        const http = context.switchToHttp();
        const request = http.getRequest<OAuthRequest>();
        const reply = http.getResponse<FastifyReply>();

        const provider = this.resolveProvider(request.params.provider);
        const { code, error } = request.query;
        const isCallback = Boolean(code || error);
        const state = isCallback ? this.verifyState(request, reply) : this.startState(reply);

        if (error) {
            throw oauthException(OAuthErrorCodes.PROVIDER_DENIED);
        }

        return this.authenticate(
            provider,
            { session: false, property: OAUTH_PROFILE_PROPERTY, state },
            context,
        );
    }

    protected authenticate(
        provider: OAuthProvider,
        options: IAuthModuleOptions,
        context: ExecutionContext,
    ): Promise<boolean> {
        const StrategyGuard = AuthGuard(provider);
        return new StrategyGuard(options).canActivate(context) as Promise<boolean>;
    }

    private resolveProvider(value: string | undefined): OAuthProvider {
        if (!isOAuthProvider(value)) {
            throw oauthException(OAuthErrorCodes.PROVIDER_NOT_SUPPORTED);
        }
        if (!this.settings.credentials(value)) {
            throw oauthException(OAuthErrorCodes.PROVIDER_NOT_CONFIGURED);
        }
        return value;
    }

    private startState(reply: FastifyReply): string {
        const nonce = randomBytes(NONCE_BYTES).toString('hex');
        this.cookies.setOAuthState(reply, nonce);
        return nonce;
    }

    private verifyState(request: OAuthRequest, reply: FastifyReply): string {
        const expected = request.cookies[AuthCookieName.OAUTH_STATE];
        const received = request.query.state;
        this.cookies.clearOAuthState(reply);

        if (!expected || !received || !isSameNonce(expected, received)) {
            throw oauthException(OAuthErrorCodes.STATE_MISMATCH);
        }
        return received;
    }
}
