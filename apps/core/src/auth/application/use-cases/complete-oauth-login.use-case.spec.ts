import type { UsersRepository } from '@core/users/domain/repositories';
import { User } from '@core/users/domain/user';
import { ConfigService } from '@nestjs/config';

import { OAuthProvider } from '../../domain/constants';
import { Identity } from '../../domain/identity';
import type { TokenPair, TokenService } from '../../domain/ports';
import type { IdentitiesRepository, SessionsRepository } from '../../domain/repositories';
import type { OAuthProfile } from '../../domain/schemas';
import type { Session } from '../../domain/session';
import { CompleteOAuthLoginUseCase } from './complete-oauth-login.use-case';

const PROFILE: OAuthProfile = {
    provider: OAuthProvider.GITHUB,
    providerUserId: '583231',
    email: 'octocat@example.com',
    name: 'The Octocat',
    avatarUrl: 'https://avatars.example.com/u/583231',
};

class FakeUsersRepository implements UsersRepository {
    users: User[] = [];

    async findById(id: string): Promise<User | null> {
        return this.users.find((user) => user.id === id) ?? null;
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.users.find((user) => user.email === email) ?? null;
    }

    async create(user: User): Promise<void> {
        this.users.push(user);
    }
}

class FakeIdentitiesRepository implements IdentitiesRepository {
    identities: Identity[] = [];

    async create(identity: Identity): Promise<void> {
        this.identities.push(identity);
    }

    async findByProvider(
        provider: OAuthProvider,
        providerUserId: string,
    ): Promise<Identity | null> {
        return (
            this.identities.find(
                (identity) =>
                    identity.provider === provider && identity.providerUserId === providerUserId,
            ) ?? null
        );
    }
}

class FakeSessionsRepository implements SessionsRepository {
    sessions: Session[] = [];

    async create(session: Session): Promise<void> {
        this.sessions.push(session);
    }

    async findById(): Promise<null> {
        return null;
    }

    async updateIfRefreshJti(): Promise<boolean> {
        return false;
    }

    async revoke(): Promise<void> {}
}

class FakeTokenService implements TokenService {
    async issuePair(session: Session): Promise<TokenPair> {
        return { accessToken: `access:${session.id}`, refreshToken: `refresh:${session.id}` };
    }

    async verifyAccess(): Promise<null> {
        return null;
    }

    async verifyRefresh(): Promise<null> {
        return null;
    }
}

const existingUser = (email = PROFILE.email): User => User.create({ email, name: 'Existing' });

describe('CompleteOAuthLoginUseCase', () => {
    let users: FakeUsersRepository;
    let identities: FakeIdentitiesRepository;
    let sessions: FakeSessionsRepository;
    let useCase: CompleteOAuthLoginUseCase;

    beforeEach(() => {
        users = new FakeUsersRepository();
        identities = new FakeIdentitiesRepository();
        sessions = new FakeSessionsRepository();
        useCase = new CompleteOAuthLoginUseCase(
            users,
            identities,
            sessions,
            new FakeTokenService(),
            new ConfigService({ JWT_REFRESH_EXPIRES_IN: '30d' }),
        );
    });

    it.each([
        {
            name: 'signs in the user of an existing identity',
            arrange: (): string => {
                const user = existingUser('changed@example.com');
                users.users.push(user);
                identities.identities.push(
                    Identity.create({
                        userId: user.id,
                        provider: PROFILE.provider,
                        providerUserId: PROFILE.providerUserId,
                    }),
                );
                return user.id;
            },
            expectedUsers: 1,
            expectedIdentities: 1,
        },
        {
            name: 'links a new identity to the user with the same email',
            arrange: (): string => {
                const user = existingUser();
                users.users.push(user);
                return user.id;
            },
            expectedUsers: 1,
            expectedIdentities: 1,
        },
        {
            name: 'creates a user and an identity for a new email',
            arrange: (): undefined => undefined,
            expectedUsers: 1,
            expectedIdentities: 1,
        },
    ])('$name', async ({ arrange, expectedUsers, expectedIdentities }) => {
        const arrangedUserId = arrange();

        const pair = await useCase.execute(PROFILE);

        expect(users.users).toHaveLength(expectedUsers);
        expect(identities.identities).toHaveLength(expectedIdentities);

        const [user] = users.users;
        const [identity] = identities.identities;
        const [session] = sessions.sessions;

        expect(user?.id).toBe(arrangedUserId ?? user?.id);
        expect(identity).toMatchObject({
            userId: user?.id,
            provider: PROFILE.provider,
            providerUserId: PROFILE.providerUserId,
        });
        expect(sessions.sessions).toHaveLength(1);
        expect(session?.userId).toBe(user?.id);
        expect(pair).toEqual({
            accessToken: `access:${session?.id}`,
            refreshToken: `refresh:${session?.id}`,
        });
    });

    it('stores the profile data on a new user', async () => {
        await useCase.execute(PROFILE);

        expect(users.users[0]).toMatchObject({
            email: PROFILE.email,
            name: PROFILE.name,
            avatarUrl: PROFILE.avatarUrl,
        });
    });
});
