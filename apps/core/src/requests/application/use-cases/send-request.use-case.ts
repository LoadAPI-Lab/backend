import { Injectable, Logger } from '@nestjs/common';
import type { HttpRequest } from '@shared/http-request';

import { RequestOutcomeKind } from '../../domain/constants';
import { HttpSender } from '../../domain/ports';
import type { RequestOutcome } from '../../domain/request-outcome';

@Injectable()
export class SendRequestUseCase {
    private readonly logger = new Logger(SendRequestUseCase.name);

    constructor(private readonly sender: HttpSender) {}

    async execute(request: HttpRequest, userId: string): Promise<RequestOutcome> {
        const outcome = await this.sender.send(request);

        this.logger.debug({
            message: 'Request sent',
            userId,
            method: request.method,
            ...(outcome.kind === RequestOutcomeKind.RESPONSE
                ? { status: outcome.status }
                : { category: outcome.error.category }),
            durationMs: outcome.durationMs,
        });

        return outcome;
    }
}
