import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import {
    InjectThrottlerStorage,
    ThrottlerException,
    type ThrottlerStorage,
} from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { SEND_REQUEST_RATE_LIMIT, SEND_REQUEST_RATE_LIMIT_TTL_MS } from '../../domain/constants';

const THROTTLER_NAME = 'send-request';
const RETRY_AFTER_HEADER = 'Retry-After';

@Injectable()
export class SendRequestRateLimitGuard implements CanActivate {
    constructor(@InjectThrottlerStorage() private readonly storage: ThrottlerStorage) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const http = context.switchToHttp();
        const { user } = http.getRequest<FastifyRequest>();
        if (!user) {
            return true;
        }

        const { isBlocked, timeToBlockExpire } = await this.storage.increment(
            `${THROTTLER_NAME}:${user.id}`,
            SEND_REQUEST_RATE_LIMIT_TTL_MS,
            SEND_REQUEST_RATE_LIMIT,
            SEND_REQUEST_RATE_LIMIT_TTL_MS,
            THROTTLER_NAME,
        );

        if (isBlocked) {
            http.getResponse<FastifyReply>().header(RETRY_AFTER_HEADER, timeToBlockExpire);
            throw new ThrottlerException();
        }

        return true;
    }
}
