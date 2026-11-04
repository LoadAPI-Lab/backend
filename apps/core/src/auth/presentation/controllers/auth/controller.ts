import { HttpCode, HttpStatus, Post, Req, Res, UseFilters } from '@nestjs/common';
import { ApiBaseController, Public, SkipContract } from '@shared/decorators';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { LogoutUseCase, RefreshSessionUseCase } from '../../../application/use-cases';
import { AuthCookieName } from '../../../domain/constants';
import { AuthCookies } from '../../cookies';
import { ClearAuthCookiesFilter } from '../../filters';
import { LogoutSwagger, RefreshSessionSwagger } from './swagger';

@ApiBaseController('auth', 'Auth')
export class AuthController {
    constructor(
        private readonly refreshSession: RefreshSessionUseCase,
        private readonly logoutSession: LogoutUseCase,
        private readonly cookies: AuthCookies,
    ) {}

    @Post('refresh')
    @Public()
    @HttpCode(HttpStatus.NO_CONTENT)
    @UseFilters(ClearAuthCookiesFilter)
    @SkipContract()
    @RefreshSessionSwagger()
    async refresh(
        @Req() request: FastifyRequest,
        @Res({ passthrough: true }) reply: FastifyReply,
    ): Promise<void> {
        const tokens = await this.refreshSession.execute(
            request.cookies[AuthCookieName.REFRESH_TOKEN],
        );
        this.cookies.setAuthCookies(reply, tokens);
    }

    @Post('logout')
    @Public()
    @HttpCode(HttpStatus.NO_CONTENT)
    @SkipContract()
    @LogoutSwagger()
    async logout(
        @Req() request: FastifyRequest,
        @Res({ passthrough: true }) reply: FastifyReply,
    ): Promise<void> {
        await this.logoutSession.execute(request.cookies[AuthCookieName.REFRESH_TOKEN]);
        this.cookies.clearAuthCookies(reply);
    }
}
