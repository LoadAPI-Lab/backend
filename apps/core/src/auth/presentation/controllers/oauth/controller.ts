import { Get, HttpStatus, Req, Res, UseFilters, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBaseController, Public, SkipContract } from '@shared/decorators';
import type { FastifyReply } from 'fastify';

import type { OAuthProvidersResponse } from '../../../application/dtos';
import {
    CompleteOAuthLoginUseCase,
    GetOAuthProvidersUseCase,
} from '../../../application/use-cases';
import { oauthCallbackUrl } from '../../../domain/constants';
import { AuthCookies } from '../../cookies';
import { OAuthRedirectFilter } from '../../filters';
import { type OAuthCallbackRequest, OAuthGuard } from '../../guards';
import { GetOAuthProvidersSwagger, OAuthCallbackSwagger, StartOAuthSwagger } from './swagger';

@ApiBaseController('oauth', 'OAuth')
export class OAuthController {
    constructor(
        private readonly getOAuthProviders: GetOAuthProvidersUseCase,
        private readonly completeOAuthLogin: CompleteOAuthLoginUseCase,
        private readonly cookies: AuthCookies,
        private readonly cfg: ConfigService,
    ) {}

    @Get('providers')
    @Public()
    @GetOAuthProvidersSwagger()
    providers(): OAuthProvidersResponse {
        return this.getOAuthProviders.execute();
    }

    @Get(':provider')
    @Public()
    @UseGuards(OAuthGuard)
    @UseFilters(OAuthRedirectFilter)
    @SkipContract()
    @StartOAuthSwagger()
    start(): void {
        return undefined;
    }

    @Get(':provider/callback')
    @Public()
    @UseGuards(OAuthGuard)
    @UseFilters(OAuthRedirectFilter)
    @SkipContract()
    @OAuthCallbackSwagger()
    async callback(
        @Req() request: OAuthCallbackRequest,
        @Res() reply: FastifyReply,
    ): Promise<void> {
        const tokens = await this.completeOAuthLogin.execute(request.oauthProfile);
        this.cookies.setAuthCookies(reply, tokens);
        reply.redirect(oauthCallbackUrl(this.cfg.get('FRONTEND_URL')), HttpStatus.FOUND);
    }
}
