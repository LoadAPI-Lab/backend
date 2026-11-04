import {
    CreateUserUseCase,
    FindUserByEmailQuery,
    GetUserByIdQuery,
} from '@core/users/application/use-cases';
import type { User } from '@core/users/domain/user';
import { durationToSeconds } from '@libs/config';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Identity } from '../../domain/identity';
import { type TokenPair, TokenService } from '../../domain/ports';
import { IdentitiesRepository, SessionsRepository } from '../../domain/repositories';
import type { OAuthProfile } from '../../domain/schemas';
import { Session } from '../../domain/session';

@Injectable()
export class CompleteOAuthLoginUseCase {
    private readonly refreshTtlSeconds: number;

    constructor(
        private readonly getUserById: GetUserByIdQuery,
        private readonly findUserByEmail: FindUserByEmailQuery,
        private readonly createUser: CreateUserUseCase,
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
            return this.getUserById.execute(identity.userId);
        }

        const existing = await this.findUserByEmail.execute(profile.email);
        if (existing) {
            await this.linkIdentity(existing, profile);
            return existing;
        }

        const user = await this.createUser.execute({
            email: profile.email,
            name: profile.name,
            avatarUrl: profile.avatarUrl,
        });
        await this.linkIdentity(user, profile);
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
