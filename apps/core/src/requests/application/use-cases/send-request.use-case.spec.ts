import { HttpMethod } from '@shared/constants';
import type { HttpRequest } from '@shared/http-request';

import { RequestOutcomeKind } from '../../domain/constants';
import type { HttpSender } from '../../domain/ports';
import type { RequestOutcome } from '../../domain/request-outcome';
import { SendRequestUseCase } from './send-request.use-case';

const USER_ID = 'user-1';
const UUID_V4 = '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';

const TEMPLATE_REQUEST: HttpRequest = {
    method: HttpMethod.POST,
    url: 'https://api.example.com/users/{{$uuid}}',
    headers: { 'X-Request-Id': '{{$uuid}}' },
    body: '{"email":"{{$randomEmail}}"}',
};

const OUTCOME: RequestOutcome = {
    kind: RequestOutcomeKind.RESPONSE,
    status: 200,
    headers: [],
    sizeBytes: 0,
    durationMs: 1,
};

class FakeHttpSender implements HttpSender {
    readonly sent: HttpRequest[] = [];

    send(request: HttpRequest): Promise<RequestOutcome> {
        this.sent.push(request);
        return Promise.resolve(OUTCOME);
    }
}

describe('SendRequestUseCase', () => {
    it('sends the resolved url, header value and body instead of the template', async () => {
        const sender = new FakeHttpSender();

        await new SendRequestUseCase(sender).execute(TEMPLATE_REQUEST, USER_ID);

        expect(sender.sent).toHaveLength(1);
        const [sent] = sender.sent;
        expect(sent?.method).toBe(TEMPLATE_REQUEST.method);
        expect(sent?.url).toMatch(new RegExp(`^https://api\\.example\\.com/users/${UUID_V4}$`));
        expect(sent?.headers?.['X-Request-Id']).toMatch(new RegExp(`^${UUID_V4}$`));
        expect(sent?.body).toMatch(/^\{"email":"user_[0-9a-z]+@example\.com"\}$/);
    });
});
