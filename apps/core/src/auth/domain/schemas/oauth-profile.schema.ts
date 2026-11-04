import { z } from 'zod/v4';

import { OAUTH_PROVIDERS } from '../constants';

const PROVIDER_USER_ID_MAX_LENGTH = 255;
const EMAIL_MAX_LENGTH = 255;
const NAME_MAX_LENGTH = 255;

export const oauthProfileSchema = z.object({
    provider: z.enum(OAUTH_PROVIDERS),
    providerUserId: z.string().min(1).max(PROVIDER_USER_ID_MAX_LENGTH),
    email: z.string().trim().toLowerCase().pipe(z.email().max(EMAIL_MAX_LENGTH)),
    name: z
        .string()
        .trim()
        .min(1)
        .transform((name) => name.slice(0, NAME_MAX_LENGTH)),
    avatarUrl: z.url().optional(),
});

export type OAuthProfile = z.infer<typeof oauthProfileSchema>;
