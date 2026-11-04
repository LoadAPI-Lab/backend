import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC } from '@shared/decorators';
import type { FastifyRequest } from 'fastify';

import { AuthCookieName } from '../../domain/constants';
import { AuthErrorCodes, authException } from '../../domain/errors';
import { TokenService } from '../../domain/ports';

@Injectable()
export class AccessTokenGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly tokens: TokenService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest<FastifyRequest>();
        const token = request.cookies[AuthCookieName.ACCESS_TOKEN];
        const claims = token ? await this.tokens.verifyAccess(token) : null;
        if (!claims) {
            throw authException(AuthErrorCodes.UNAUTHENTICATED);
        }

        request.user = { id: claims.sub, sessionId: claims.sid };
        return true;
    }
}
