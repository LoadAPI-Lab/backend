import type { Provider } from '@nestjs/common';

import { TokenService } from '../../domain/ports';
import { TokenServiceImpl } from './token-service';

export * from './token-service';

export const SECURITY_PROVIDERS: Provider[] = [
    { provide: TokenService, useClass: TokenServiceImpl },
];
