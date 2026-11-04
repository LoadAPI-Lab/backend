import { durationToSeconds } from '@libs/config';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthErrorCodes, authException } from '../../domain/errors';
import { type TokenPair, TokenService } from '../../domain/ports';
import { SessionsRepository } from '../../domain/repositories';

@Injectable()
export class RefreshSessionUseCase {
    private readonly logger = new Logger(RefreshSessionUseCase.name);
    private readonly refreshTtlSeconds: number;

    constructor(
        private readonly sessions: SessionsRepository,
        private readonly tokens: TokenService,
        cfg: ConfigService,
    ) {
        this.refreshTtlSeconds = durationToSeconds(cfg.get('JWT_REFRESH_EXPIRES_IN'));
    }

    async execute(refreshToken: string | undefined, now = new Date()): Promise<TokenPair> {
        const claims = refreshToken ? await this.tokens.verifyRefresh(refreshToken) : null;
        if (!claims) {
            throw authException(AuthErrorCodes.SESSION_INVALID);
        }

        const session = await this.sessions.findById(claims.sid);
        if (!session || session.userId !== claims.sub || !session.isActive(now)) {
            throw authException(AuthErrorCodes.SESSION_INVALID);
        }

        session.rotate(now, this.refreshTtlSeconds);

        const rotated = await this.sessions.updateIfRefreshJti(session, claims.jti);
        if (!rotated) {
            await this.sessions.revoke(session.id, now);
            this.logger.warn({
                message: 'Refresh token reuse detected, session revoked',
                userId: session.userId,
                sessionId: session.id,
            });
            throw authException(AuthErrorCodes.SESSION_INVALID);
        }

        return this.tokens.issuePair(session);
    }
}
