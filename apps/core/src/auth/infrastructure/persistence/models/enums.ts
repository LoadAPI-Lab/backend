import { pgEnum } from 'drizzle-orm/pg-core';

import { OAUTH_PROVIDERS } from '../../../domain/constants';

export const oauthProviderEnum = pgEnum('oauth_provider', OAUTH_PROVIDERS);
