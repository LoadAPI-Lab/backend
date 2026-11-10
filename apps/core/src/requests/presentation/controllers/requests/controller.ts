import { Body, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBaseController, CurrentUser } from '@shared/decorators';
import { RouteBodyLimit } from '@shared/http';
import type { AuthenticatedUser } from '@shared/types';

import { SendRequestDto } from '../../../application/dtos';
import { SendRequestUseCase } from '../../../application/use-cases';
import type { RequestOutcome } from '../../../domain/request-outcome';
import { SendRequestRateLimitGuard } from '../../guards';
import { SendRequestSwagger } from './swagger';

const SEND_REQUEST_BODY_LIMIT_BYTES = 2_097_152;

@ApiBaseController('requests', 'Requests')
export class RequestsController {
    constructor(private readonly sendRequest: SendRequestUseCase) {}

    @Post()
    @HttpCode(HttpStatus.OK)
    @UseGuards(SendRequestRateLimitGuard)
    @RouteBodyLimit(SEND_REQUEST_BODY_LIMIT_BYTES)
    @SendRequestSwagger()
    send(
        @Body() dto: SendRequestDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<RequestOutcome> {
        return this.sendRequest.execute(dto, user.id);
    }
}
