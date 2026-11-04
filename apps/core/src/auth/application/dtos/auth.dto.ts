import { createZodDto } from 'nestjs-zod';
import { z } from 'zod/v4';

import { OAUTH_PROVIDERS } from '../../domain/constants';

const oauthProvidersResponseSchema = z
    .array(
        z.object({
            id: z.enum(OAUTH_PROVIDERS).describe('Provider id, used in the OAuth URLs'),
            name: z.string().describe('Provider name to show on the sign-in button'),
        }),
    )
    .describe('OAuth providers configured on the server');

export class OAuthProvidersResponseDto extends createZodDto(oauthProvidersResponseSchema) {}

export type OAuthProvidersResponse = z.infer<typeof oauthProvidersResponseSchema>;
