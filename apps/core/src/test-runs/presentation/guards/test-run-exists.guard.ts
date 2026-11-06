import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { TestRunParamsDto } from '../../application/dtos';
import { GetTestRunUseCase } from '../../application/use-cases';
import { TestRunErrorCodes, testRunException } from '../../domain/errors';

@Injectable()
export class TestRunExistsGuard implements CanActivate {
    constructor(private readonly getTestRun: GetTestRunUseCase) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { params, user } = context.switchToHttp().getRequest<FastifyRequest>();
        const parsedParams = TestRunParamsDto.schema.safeParse(params);

        if (!parsedParams.success) {
            return true;
        }

        if (!user) {
            throw testRunException(TestRunErrorCodes.NOT_FOUND);
        }

        await this.getTestRun.execute(parsedParams.data.id, user.id);

        return true;
    }
}
