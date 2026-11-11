import type { HttpRequest } from '@shared/http-request';

import type { RequestOutcome } from '../request-outcome';

export abstract class HttpSender {
    abstract send(request: HttpRequest): Promise<RequestOutcome>;
}
