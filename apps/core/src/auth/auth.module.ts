import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { UsersModule } from '../users/users.module';
import { USE_CASES } from './application/use-cases';
import { OAUTH_INTEGRATION_PROVIDERS } from './infrastructure/oauth';
import { REPOSITORIES } from './infrastructure/persistence/repository';
import { SECURITY_PROVIDERS } from './infrastructure/security';
import { CONTROLLERS } from './presentation/controllers';
import { COOKIE_PROVIDERS } from './presentation/cookies';
import { GLOBAL_GUARDS } from './presentation/guards';

@Module({
    imports: [JwtModule.register({}), UsersModule],
    controllers: [...CONTROLLERS],
    providers: [
        ...USE_CASES,
        ...REPOSITORIES,
        ...OAUTH_INTEGRATION_PROVIDERS,
        ...SECURITY_PROVIDERS,
        ...COOKIE_PROVIDERS,
        ...GLOBAL_GUARDS,
    ],
})
export class AuthModule {}
