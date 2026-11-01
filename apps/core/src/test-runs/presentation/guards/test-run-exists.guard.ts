import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { TestRunParamsDto } from '../../application/dtos';
import { GetTestRunUseCase } from '../../application/use-cases';

@Injectable()
export class TestRunExistsGuard implements CanActivate {
    constructor(private readonly getTestRun: GetTestRunUseCase) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { params } = context.switchToHttp().getRequest<FastifyRequest>();
        const parsedParams = TestRunParamsDto.schema.safeParse(params);

        if (parsedParams.success) {
            await this.getTestRun.execute(parsedParams.data.id);
        }

        return true;
    }
}
