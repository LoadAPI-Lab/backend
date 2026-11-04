import { durationToSeconds } from '@libs/config';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { z } from 'zod/v4';

import { TokenType } from '../../domain/constants';
import {
    type AccessTokenClaims,
    type RefreshTokenClaims,
    type TokenPair,
    TokenService,
} from '../../domain/ports';
import type { Session } from '../../domain/session';

const ALGORITHM = 'HS256';
const CLOCK_TOLERANCE_SECONDS = 5;

const accessClaimsSchema = z.object({
    sub: z.uuid(),
    sid: z.uuid(),
    typ: z.literal(TokenType.ACCESS),
});

const refreshClaimsSchema = z.object({
    sub: z.uuid(),
    sid: z.uuid(),
    jti: z.uuid(),
    typ: z.literal(TokenType.REFRESH),
});

@Injectable()
export class TokenServiceImpl implements TokenService {
    private readonly issuer: string;
    private readonly audience: string;
    private readonly accessSecret: string;
    private readonly refreshSecret: string;
    private readonly accessTtlSeconds: number;
    private readonly refreshTtlSeconds: number;

    constructor(
        private readonly jwt: JwtService,
        cfg: ConfigService,
    ) {
        this.issuer = cfg.get('JWT_ISSUER');
        this.audience = cfg.get('JWT_AUDIENCE');
        this.accessSecret = cfg.get('JWT_ACCESS_SECRET');
        this.refreshSecret = cfg.get('JWT_REFRESH_SECRET');
        this.accessTtlSeconds = durationToSeconds(cfg.get('JWT_ACCESS_EXPIRES_IN'));
        this.refreshTtlSeconds = durationToSeconds(cfg.get('JWT_REFRESH_EXPIRES_IN'));
    }

    async issuePair(session: Session): Promise<TokenPair> {
        const [accessToken, refreshToken] = await Promise.all([
            this.jwt.signAsync(
                { sid: session.id, typ: TokenType.ACCESS },
                {
                    secret: this.accessSecret,
                    algorithm: ALGORITHM,
                    issuer: this.issuer,
                    audience: this.audience,
                    subject: session.userId,
                    expiresIn: this.accessTtlSeconds,
                },
            ),
            this.jwt.signAsync(
                { sid: session.id, typ: TokenType.REFRESH },
                {
                    secret: this.refreshSecret,
                    algorithm: ALGORITHM,
                    issuer: this.issuer,
                    audience: this.audience,
                    subject: session.userId,
                    jwtid: session.refreshJti,
                    expiresIn: this.refreshTtlSeconds,
                },
            ),
        ]);

        return { accessToken, refreshToken };
    }

    verifyAccess(token: string): Promise<AccessTokenClaims | null> {
        return this.verify(token, this.accessSecret, accessClaimsSchema);
    }

    verifyRefresh(token: string): Promise<RefreshTokenClaims | null> {
        return this.verify(token, this.refreshSecret, refreshClaimsSchema);
    }

    private async verify<Claims>(
        token: string,
        secret: string,
        claims: z.ZodType<Claims>,
    ): Promise<Claims | null> {
        try {
            const payload = await this.jwt.verifyAsync<object>(token, {
                secret,
                algorithms: [ALGORITHM],
                issuer: this.issuer,
                audience: this.audience,
                clockTolerance: CLOCK_TOLERANCE_SECONDS,
            });
            const parsed = claims.safeParse(payload);
            return parsed.success ? parsed.data : null;
        } catch {
            return null;
        }
    }
}
