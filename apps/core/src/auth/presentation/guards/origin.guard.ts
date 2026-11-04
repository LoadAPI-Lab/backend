import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyRequest } from 'fastify';

import { AuthErrorCodes, authException } from '../../domain/errors';

const SAFE_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class OriginGuard implements CanActivate {
    private readonly allowedOrigins: ReadonlySet<string>;

    constructor(cfg: ConfigService) {
        const ownUrl = cfg.get('API_PUBLIC_URL') ?? `http://localhost:${cfg.get('PORT')}`;
        this.allowedOrigins = new Set(
            [...cfg.get('CORS_ALLOWED_ORIGINS'), ownUrl].map((url) => new URL(url).origin),
        );
    }

    canActivate(context: ExecutionContext): boolean {
        const { method, headers } = context.switchToHttp().getRequest<FastifyRequest>();
        if (SAFE_METHODS.has(method)) {
            return true;
        }

        const { origin } = headers;
        if (origin === undefined || this.allowedOrigins.has(origin)) {
            return true;
        }

        throw authException(AuthErrorCodes.ORIGIN_NOT_ALLOWED);
    }
}
