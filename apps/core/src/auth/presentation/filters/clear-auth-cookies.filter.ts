import { type ArgumentsHost, Catch, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GlobalExceptionFilter } from '@shared/error';
import type { FastifyReply } from 'fastify';

import { AuthCookies } from '../cookies';

@Catch()
export class ClearAuthCookiesFilter extends GlobalExceptionFilter {
    constructor(
        configService: ConfigService,
        private readonly cookies: AuthCookies,
    ) {
        super(configService);
    }

    override catch(exception: unknown, host: ArgumentsHost) {
        if (
            exception instanceof HttpException &&
            exception.getStatus() === HttpStatus.UNAUTHORIZED
        ) {
            this.cookies.clearAuthCookies(host.switchToHttp().getResponse<FastifyReply>());
        }
        return super.catch(exception, host);
    }
}
