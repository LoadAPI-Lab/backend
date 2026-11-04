import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isBaseExceptionWithCode } from '@shared/error';

import { TokenType } from '../../domain/constants';
import { AuthErrorCodes } from '../../domain/errors';
import type { RefreshTokenClaims, TokenPair, TokenService } from '../../domain/ports';
import type { SessionsRepository } from '../../domain/repositories';
import { Session } from '../../domain/session';
import { RefreshSessionUseCase } from './refresh-session.use-case';

const USER_ID = '6f1c2d4e-7a1e-4f0b-9c3a-2e8d5f6a7b90';
const SESSION_ID = '9a2b3c4d-7a1e-4f0b-9c3a-2e8d5f6a7b90';
const CURRENT_JTI = '1b2c3d4e-7a1e-4f0b-9c3a-2e8d5f6a7b90';
const USED_JTI = '2c3d4e5f-7a1e-4f0b-9c3a-2e8d5f6a7b90';
const REFRESH_TOKEN = 'refresh-token';
const REFRESH_TTL_SECONDS = 30 * 86_400;

const NOW = new Date('2026-01-10T00:00:00.000Z');
const CREATED_AT = new Date('2026-01-01T00:00:00.000Z');
const FUTURE = new Date('2026-02-01T00:00:00.000Z');
const PAST = new Date('2026-01-09T00:00:00.000Z');

interface SessionRow {
    refreshJti: string;
    expiresAt: Date;
    revokedAt?: Date;
}

class FakeSessionsRepository implements SessionsRepository {
    rows = new Map<string, SessionRow>();
    revoked: string[] = [];

    async create(): Promise<void> {}

    async findById(id: string): Promise<Session | null> {
        const row = this.rows.get(id);
        return row
            ? Session.restore({
                  id,
                  userId: USER_ID,
                  createdAt: CREATED_AT,
                  updatedAt: CREATED_AT,
                  ...row,
              })
            : null;
    }

    async updateIfRefreshJti(session: Session, expectedJti: string): Promise<boolean> {
        const row = this.rows.get(session.id);
        if (!row || row.refreshJti !== expectedJti || row.revokedAt) {
            return false;
        }
        row.refreshJti = session.refreshJti;
        row.expiresAt = session.expiresAt;
        return true;
    }

    async revoke(id: string, at: Date): Promise<void> {
        this.revoked.push(id);
        const row = this.rows.get(id);
        if (row) {
            row.revokedAt = at;
        }
    }
}

class FakeTokenService implements TokenService {
    claims: RefreshTokenClaims | null = null;

    async issuePair(session: Session): Promise<TokenPair> {
        return {
            accessToken: `access:${session.id}`,
            refreshToken: `refresh:${session.refreshJti}`,
        };
    }

    async verifyAccess(): Promise<null> {
        return null;
    }

    async verifyRefresh(): Promise<RefreshTokenClaims | null> {
        return this.claims;
    }
}

const claimsWithJti = (jti: string): RefreshTokenClaims => ({
    sub: USER_ID,
    sid: SESSION_ID,
    jti,
    typ: TokenType.REFRESH,
});

const isSessionInvalid = (error: unknown) =>
    isBaseExceptionWithCode(error, AuthErrorCodes.SESSION_INVALID);

describe('RefreshSessionUseCase', () => {
    let sessions: FakeSessionsRepository;
    let tokens: FakeTokenService;
    let useCase: RefreshSessionUseCase;

    beforeEach(() => {
        sessions = new FakeSessionsRepository();
        tokens = new FakeTokenService();
        useCase = new RefreshSessionUseCase(
            sessions,
            tokens,
            new ConfigService({ JWT_REFRESH_EXPIRES_IN: '30d' }),
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('rotates the refresh jti and issues a new pair', async () => {
        sessions.rows.set(SESSION_ID, { refreshJti: CURRENT_JTI, expiresAt: FUTURE });
        tokens.claims = claimsWithJti(CURRENT_JTI);

        const pair = await useCase.execute(REFRESH_TOKEN, NOW);

        const row = sessions.rows.get(SESSION_ID);
        expect(row?.refreshJti).not.toBe(CURRENT_JTI);
        expect(row?.expiresAt).toEqual(new Date(NOW.getTime() + REFRESH_TTL_SECONDS * 1000));
        expect(pair).toEqual({
            accessToken: `access:${SESSION_ID}`,
            refreshToken: `refresh:${row?.refreshJti}`,
        });
        expect(sessions.revoked).toEqual([]);
    });

    it('revokes the session and logs a warning when the jti was already used', async () => {
        const logWarn = vi.spyOn(Logger.prototype, 'warn').mockReturnValue();
        sessions.rows.set(SESSION_ID, { refreshJti: CURRENT_JTI, expiresAt: FUTURE });
        tokens.claims = claimsWithJti(USED_JTI);

        await expect(useCase.execute(REFRESH_TOKEN, NOW)).rejects.toSatisfy(isSessionInvalid);

        expect(sessions.revoked).toEqual([SESSION_ID]);
        expect(sessions.rows.get(SESSION_ID)?.revokedAt).toEqual(NOW);
        expect(logWarn).toHaveBeenCalledWith(
            expect.objectContaining({ userId: USER_ID, sessionId: SESSION_ID }),
        );
        expect(JSON.stringify(logWarn.mock.calls)).not.toContain(REFRESH_TOKEN);
    });

    it.each([
        { name: 'the session is missing', row: undefined },
        {
            name: 'the session is revoked',
            row: { refreshJti: CURRENT_JTI, expiresAt: FUTURE, revokedAt: PAST },
        },
        { name: 'the session is expired', row: { refreshJti: CURRENT_JTI, expiresAt: PAST } },
    ])('rejects without rotating when $name', async ({ row }) => {
        if (row) {
            sessions.rows.set(SESSION_ID, { ...row });
        }
        tokens.claims = claimsWithJti(CURRENT_JTI);

        await expect(useCase.execute(REFRESH_TOKEN, NOW)).rejects.toSatisfy(isSessionInvalid);

        expect(sessions.rows.get(SESSION_ID)?.refreshJti).toBe(row?.refreshJti);
        expect(sessions.revoked).toEqual([]);
    });

    it.each([
        { name: 'the token does not verify', token: REFRESH_TOKEN },
        { name: 'the cookie is missing', token: undefined },
    ])('rejects when $name', async ({ token }) => {
        sessions.rows.set(SESSION_ID, { refreshJti: CURRENT_JTI, expiresAt: FUTURE });
        tokens.claims = null;

        await expect(useCase.execute(token, NOW)).rejects.toSatisfy(isSessionInvalid);

        expect(sessions.rows.get(SESSION_ID)?.refreshJti).toBe(CURRENT_JTI);
    });
});
