import { UserErrorCodes, UserErrorMessages } from '@core/users/domain/errors';
import { UsersRepository } from '@core/users/domain/repositories';
import { User } from '@core/users/domain/user';
import { durationToSeconds } from '@libs/config';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseException } from '@shared/error';

import { Identity } from '../../domain/identity';
import { type TokenPair, TokenService } from '../../domain/ports';
import { IdentitiesRepository, SessionsRepository } from '../../domain/repositories';
import type { OAuthProfile } from '../../domain/schemas';
import { Session } from '../../domain/session';

@Injectable()
export class CompleteOAuthLoginUseCase {
    private readonly refreshTtlSeconds: number;

    constructor(
        private readonly users: UsersRepository,
        private readonly identities: IdentitiesRepository,
        private readonly sessions: SessionsRepository,
        private readonly tokens: TokenService,
        cfg: ConfigService,
    ) {
        this.refreshTtlSeconds = durationToSeconds(cfg.get('JWT_REFRESH_EXPIRES_IN'));
    }

    async execute(profile: OAuthProfile): Promise<TokenPair> {
        const user = await this.findOrCreateUser(profile);
        const session = Session.create({ userId: user.id, ttlSeconds: this.refreshTtlSeconds });

        await this.sessions.create(session);

        return this.tokens.issuePair(session);
    }

    private async findOrCreateUser(profile: OAuthProfile): Promise<User> {
        const identity = await this.identities.findByProvider(
            profile.provider,
            profile.providerUserId,
        );
        if (identity) {
            return this.requireUser(identity.userId);
        }

        const existing = await this.users.findByEmail(profile.email);
        if (existing) {
            await this.linkIdentity(existing, profile);
            return existing;
        }

        const user = User.create({
            email: profile.email,
            name: profile.name,
            avatarUrl: profile.avatarUrl,
        });
        await this.users.create(user);
        await this.linkIdentity(user, profile);
        return user;
    }

    private async requireUser(userId: string): Promise<User> {
        const user = await this.users.findById(userId);
        if (!user) {
            throw new BaseException(
                {
                    code: UserErrorCodes.NOT_FOUND,
                    message: UserErrorMessages[UserErrorCodes.NOT_FOUND],
                },
                HttpStatus.NOT_FOUND,
            );
        }
        return user;
    }

    private linkIdentity(user: User, profile: OAuthProfile): Promise<void> {
        return this.identities.create(
            Identity.create({
                userId: user.id,
                provider: profile.provider,
                providerUserId: profile.providerUserId,
            }),
        );
    }
}
