import type { Provider } from '@nestjs/common';

import { AuthCookies } from './auth-cookies';

export * from './auth-cookies';

export const COOKIE_PROVIDERS: Provider[] = [AuthCookies];
