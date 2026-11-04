import { Injectable } from '@nestjs/common';

import { TokenService } from '../../domain/ports';
import { SessionsRepository } from '../../domain/repositories';

@Injectable()
export class LogoutUseCase {
    constructor(
        private readonly sessions: SessionsRepository,
        private readonly tokens: TokenService,
    ) {}

    async execute(refreshToken: string | undefined): Promise<void> {
        const claims = refreshToken ? await this.tokens.verifyRefresh(refreshToken) : null;
        if (claims) {
            await this.sessions.revoke(claims.sid, new Date());
        }
    }
}
