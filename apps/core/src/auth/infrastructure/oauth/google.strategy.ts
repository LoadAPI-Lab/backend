import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { type Profile, Strategy } from 'passport-google-oauth20';

import { OAuthProvider } from '../../domain/constants';
import { OAuthErrorCodes, oauthException } from '../../domain/errors';
import { OAuthProviderSettings } from '../../domain/ports';
import type { OAuthProfile } from '../../domain/schemas';
import { DISABLED_CREDENTIAL, parseOAuthProfile } from './parse-oauth-profile';

const SCOPE = ['openid', 'email', 'profile'];
const EMAIL_DOMAIN = /@.*$/;

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, OAuthProvider.GOOGLE) {
    constructor(settings: OAuthProviderSettings) {
        const credentials = settings.credentials(OAuthProvider.GOOGLE);
        super({
            clientID: credentials?.clientId ?? DISABLED_CREDENTIAL,
            clientSecret: credentials?.clientSecret ?? DISABLED_CREDENTIAL,
            callbackURL: settings.callbackUrl(OAuthProvider.GOOGLE),
            scope: SCOPE,
        });
    }

    validate(_accessToken: string, _refreshToken: string, profile: Profile): OAuthProfile {
        const {
            email,
            email_verified: emailVerified,
            given_name: givenName,
            picture,
        } = profile._json;

        if (emailVerified !== true || !email) {
            throw oauthException(OAuthErrorCodes.EMAIL_NOT_VERIFIED);
        }

        return parseOAuthProfile({
            provider: OAuthProvider.GOOGLE,
            providerUserId: profile.id,
            email,
            name: profile.displayName || givenName || email.replace(EMAIL_DOMAIN, ''),
            avatarUrl: picture,
        });
    }
}
