import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import type { AuthenticatedUser } from '../types';

export const CurrentUser = createParamDecorator(
    (_data: unknown, context: ExecutionContext): AuthenticatedUser | undefined =>
        context.switchToHttp().getRequest<FastifyRequest>().user,
);
