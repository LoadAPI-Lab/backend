import type { Provider } from '@nestjs/common';

import { HttpSender } from '../../domain/ports';
import { HttpSenderImpl } from './http-sender';

export * from './http-sender';

export const HTTP_PROVIDERS: Provider[] = [{ provide: HttpSender, useClass: HttpSenderImpl }];
