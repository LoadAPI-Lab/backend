import {
    type ArgumentsHost,
    Catch,
    type ExceptionFilter,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describeError, type IErrorOptions, isBaseException } from '@shared/error';
import type { FastifyReply } from 'fastify';

import { oauthCallbackUrl } from '../../domain/constants';
import { OAuthErrorCodes } from '../../domain/errors';
import { AuthCookies } from '../cookies';

@Catch()
export class OAuthRedirectFilter implements ExceptionFilter {
    private readonly logger = new Logger(OAuthRedirectFilter.name);

    constructor(
        private readonly cookies: AuthCookies,
        private readonly cfg: ConfigService,
    ) {}

    catch(exception: unknown, host: ArgumentsHost): void {
        const reply = host.switchToHttp().getResponse<FastifyReply>();
        const code = isBaseException(exception)
            ? (exception.getResponse() as IErrorOptions).code
            : OAuthErrorCodes.AUTHENTICATION_FAILED;

        this.logger.warn({
            message: `OAuth sign-in failed: ${code}`,
            code,
            error: describeError(exception),
        });

        this.cookies.clearOAuthState(reply);
        reply.redirect(oauthCallbackUrl(this.cfg.get('FRONTEND_URL'), code), HttpStatus.FOUND);
    }
}
