import type { CookieSerializeOptions } from '@fastify/cookie';
import { durationToSeconds, NodeEnv } from '@libs/config';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyReply } from 'fastify';

import { AuthCookieName, AuthCookiePath, OAUTH_STATE_TTL_SECONDS } from '../../domain/constants';
import type { TokenPair } from '../../domain/ports';

@Injectable()
export class AuthCookies {
    private readonly secure: boolean;
    private readonly domain: string | undefined;
    private readonly accessTtlSeconds: number;
    private readonly refreshTtlSeconds: number;

    constructor(cfg: ConfigService) {
        this.secure = cfg.get('NODE_ENV') === NodeEnv.PRODUCTION;
        this.domain = cfg.get('COOKIE_DOMAIN');
        this.accessTtlSeconds = durationToSeconds(cfg.get('JWT_ACCESS_EXPIRES_IN'));
        this.refreshTtlSeconds = durationToSeconds(cfg.get('JWT_REFRESH_EXPIRES_IN'));
    }

    setAuthCookies(reply: FastifyReply, tokens: TokenPair): void {
        reply.setCookie(AuthCookieName.ACCESS_TOKEN, tokens.accessToken, {
            ...this.options(AuthCookiePath.ACCESS_TOKEN, this.domain),
            maxAge: this.accessTtlSeconds,
        });
        reply.setCookie(AuthCookieName.REFRESH_TOKEN, tokens.refreshToken, {
            ...this.options(AuthCookiePath.REFRESH_TOKEN, this.domain),
            maxAge: this.refreshTtlSeconds,
        });
    }

    clearAuthCookies(reply: FastifyReply): void {
        reply.clearCookie(
            AuthCookieName.ACCESS_TOKEN,
            this.options(AuthCookiePath.ACCESS_TOKEN, this.domain),
        );
        reply.clearCookie(
            AuthCookieName.REFRESH_TOKEN,
            this.options(AuthCookiePath.REFRESH_TOKEN, this.domain),
        );
    }

    setOAuthState(reply: FastifyReply, nonce: string): void {
        reply.setCookie(AuthCookieName.OAUTH_STATE, nonce, {
            ...this.options(AuthCookiePath.OAUTH_STATE),
            maxAge: OAUTH_STATE_TTL_SECONDS,
        });
    }

    clearOAuthState(reply: FastifyReply): void {
        reply.clearCookie(AuthCookieName.OAUTH_STATE, this.options(AuthCookiePath.OAUTH_STATE));
    }

    private options(path: AuthCookiePath, domain?: string): CookieSerializeOptions {
        return {
            httpOnly: true,
            sameSite: 'lax',
            secure: this.secure,
            signed: false,
            path,
            domain,
        };
    }
}
