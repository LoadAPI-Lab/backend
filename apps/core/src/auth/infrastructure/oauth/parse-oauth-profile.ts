import { OAuthErrorCodes, oauthException } from '../../domain/errors';
import { type OAuthProfile, oauthProfileSchema } from '../../domain/schemas';

export const DISABLED_CREDENTIAL = 'disabled';

export function parseOAuthProfile(candidate: unknown): OAuthProfile {
    const parsed = oauthProfileSchema.safeParse(candidate);
    if (!parsed.success) {
        throw oauthException(OAuthErrorCodes.PROFILE_INVALID);
    }
    return parsed.data;
}
