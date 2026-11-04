import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { type Profile, Strategy } from 'passport-github';
import { z } from 'zod/v4';

import { OAuthProvider } from '../../domain/constants';
import { OAuthErrorCodes, oauthException } from '../../domain/errors';
import { OAuthProviderSettings } from '../../domain/ports';
import type { OAuthProfile } from '../../domain/schemas';
import { DISABLED_CREDENTIAL, parseOAuthProfile } from './parse-oauth-profile';

const SCOPE = ['read:user', 'user:email'];
const EMAILS_URL = 'https://api.github.com/user/emails';
const EMAILS_TIMEOUT_MS = 5000;
const USER_AGENT = 'loadapi';

const githubUserSchema = z.object({
    login: z.string(),
    name: z.string().nullish(),
    avatar_url: z.string().nullish(),
});

const githubEmailsSchema = z.array(
    z.object({
        email: z.string(),
        primary: z.boolean(),
        verified: z.boolean(),
    }),
);

type GithubEmail = z.infer<typeof githubEmailsSchema>[number];

const pickVerifiedEmail = (emails: GithubEmail[]): string | undefined =>
    (
        emails.find(({ primary, verified }) => primary && verified) ??
        emails.find(({ verified }) => verified)
    )?.email;

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, OAuthProvider.GITHUB) {
    constructor(settings: OAuthProviderSettings) {
        const credentials = settings.credentials(OAuthProvider.GITHUB);
        super({
            clientID: credentials?.clientId ?? DISABLED_CREDENTIAL,
            clientSecret: credentials?.clientSecret ?? DISABLED_CREDENTIAL,
            callbackURL: settings.callbackUrl(OAuthProvider.GITHUB),
            scope: SCOPE,
        });
    }

    async validate(
        accessToken: string,
        _refreshToken: string,
        profile: Profile,
    ): Promise<OAuthProfile> {
        const user = githubUserSchema.safeParse(profile._json);
        if (!user.success) {
            throw oauthException(OAuthErrorCodes.PROFILE_INVALID);
        }

        const email = await this.fetchVerifiedEmail(accessToken);

        return parseOAuthProfile({
            provider: OAuthProvider.GITHUB,
            providerUserId: profile.id,
            email,
            name: user.data.name || user.data.login,
            avatarUrl: user.data.avatar_url ?? undefined,
        });
    }

    private async fetchVerifiedEmail(accessToken: string): Promise<string> {
        const response = await fetch(EMAILS_URL, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github+json',
                'User-Agent': USER_AGENT,
            },
            signal: AbortSignal.timeout(EMAILS_TIMEOUT_MS),
        });

        if (!response.ok) {
            throw oauthException(OAuthErrorCodes.AUTHENTICATION_FAILED);
        }

        const emails = githubEmailsSchema.safeParse(await response.json());
        if (!emails.success) {
            throw oauthException(OAuthErrorCodes.AUTHENTICATION_FAILED);
        }

        const email = pickVerifiedEmail(emails.data);
        if (!email) {
            throw oauthException(OAuthErrorCodes.EMAIL_NOT_VERIFIED);
        }

        return email;
    }
}
