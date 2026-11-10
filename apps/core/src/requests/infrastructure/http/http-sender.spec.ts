import { createServer, type RequestListener, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import type { Config } from '@libs/config';
import { HttpStatus } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { HttpMethod } from '@shared/constants';
import { BaseException } from '@shared/error';

import {
    MAX_RESPONSE_BODY_BYTES,
    RequestOutcomeKind,
    SendErrorCategory,
} from '../../domain/constants';
import { RequestErrorCodes, RequestErrorMessages } from '../../domain/errors';
import type { RequestOutcome } from '../../domain/request-outcome';
import { HttpSenderImpl } from './http-sender';

const DEFAULT_TIMEOUT_MS = 2000;
const SHORT_TIMEOUT_MS = 200;
const LOCALHOST = '127.0.0.1';
const LOCALHOST_NAME = 'localhost';
const EXTRA_BYTES = 100;

type SenderConfig = Pick<
    Config,
    'SINGLE_REQUEST_TIMEOUT_MS' | 'OUTBOUND_ALLOW_PRIVATE_NETWORKS' | 'OUTBOUND_ALLOWED_HOSTS'
>;

const DEFAULT_CONFIG: SenderConfig = {
    SINGLE_REQUEST_TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
    OUTBOUND_ALLOW_PRIVATE_NETWORKS: true,
    OUTBOUND_ALLOWED_HOSTS: [],
};

const PRIVATE_NETWORKS_DENIED: Partial<SenderConfig> = { OUTBOUND_ALLOW_PRIVATE_NETWORKS: false };

const createConfig = (overrides: Partial<SenderConfig> = {}): ConfigService => {
    const values: SenderConfig = { ...DEFAULT_CONFIG, ...overrides };
    return {
        getOrThrow: (key: keyof SenderConfig) => values[key],
    } as unknown as ConfigService;
};

const listen = (server: Server): Promise<string> =>
    new Promise((resolve) => {
        server.listen(0, LOCALHOST, () => {
            const { port } = server.address() as AddressInfo;
            resolve(`http://${LOCALHOST}:${port}`);
        });
    });

const close = (server: Server): Promise<void> =>
    new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
    });

function expectResponse(outcome: RequestOutcome) {
    if (outcome.kind !== RequestOutcomeKind.RESPONSE) {
        throw new Error(`expected a response, got ${outcome.error.category}`);
    }
    return outcome;
}

function expectTargetNotAllowed(error: unknown) {
    expect(error).toBeInstanceOf(BaseException);
    const exception = error as BaseException;
    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(exception.getResponse()).toMatchObject({
        code: RequestErrorCodes.TARGET_NOT_ALLOWED,
        message: RequestErrorMessages[RequestErrorCodes.TARGET_NOT_ALLOWED],
    });
}

function expectError(outcome: RequestOutcome) {
    if (outcome.kind !== RequestOutcomeKind.ERROR) {
        throw new Error(`expected an error, got status ${outcome.status}`);
    }
    return outcome;
}

describe('HttpSenderImpl', () => {
    let server: Server | undefined;
    let sender: HttpSenderImpl;
    let connections: number;

    const serve = async (listener: RequestListener): Promise<string> => {
        server = createServer(listener);
        server.on('connection', () => {
            connections += 1;
        });
        return listen(server);
    };

    const replaceSender = async (overrides: Partial<SenderConfig>): Promise<void> => {
        await sender.onModuleDestroy();
        sender = new HttpSenderImpl(createConfig(overrides));
    };

    const respondOk: RequestListener = (_request, response) => {
        response.end('ok');
    };

    beforeEach(() => {
        connections = 0;
        sender = new HttpSenderImpl(createConfig());
    });

    afterEach(async () => {
        await sender.onModuleDestroy();
        if (server) {
            await close(server);
            server = undefined;
        }
    });

    it('returns status, headers in order with separate set-cookie entries and a text body', async () => {
        const url = await serve((_request, response) => {
            response.writeHead(201, 'Created', [
                'Content-Type',
                'application/json',
                'Set-Cookie',
                'session=abc',
                'X-Trace',
                'trace-1',
                'Set-Cookie',
                'theme=dark',
            ]);
            response.end('{"ok":true}');
        });

        const outcome = expectResponse(await sender.send({ method: HttpMethod.GET, url }));

        expect(outcome.status).toBe(201);
        expect(outcome.statusText).toBe('Created');
        expect(outcome.headers.slice(0, 4)).toEqual([
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Set-Cookie', value: 'session=abc' },
            { name: 'X-Trace', value: 'trace-1' },
            { name: 'Set-Cookie', value: 'theme=dark' },
        ]);
        expect(outcome.body).toBe('{"ok":true}');
        expect(outcome.sizeBytes).toBe(11);
        expect(outcome.binary).toBeUndefined();
        expect(outcome.bodyTruncated).toBeUndefined();
        expect(outcome.durationMs).toBeGreaterThan(0);
    });

    it('does not follow a redirect and returns its Location header', async () => {
        const location = '/elsewhere';
        const url = await serve((_request, response) => {
            response.writeHead(302, { Location: location });
            response.end();
        });

        const outcome = expectResponse(await sender.send({ method: HttpMethod.GET, url }));

        expect(outcome.status).toBe(302);
        expect(outcome.headers).toContainEqual({ name: 'Location', value: location });
    });

    it('truncates a body larger than the limit and marks it as truncated', async () => {
        const url = await serve((_request, response) => {
            response.writeHead(200, { 'Content-Type': 'text/plain' });
            response.end('a'.repeat(MAX_RESPONSE_BODY_BYTES + EXTRA_BYTES));
        });

        const outcome = expectResponse(await sender.send({ method: HttpMethod.GET, url }));

        expect(outcome.bodyTruncated).toBe(true);
        expect(outcome.sizeBytes).toBe(MAX_RESPONSE_BODY_BYTES);
        expect(outcome.body).toHaveLength(MAX_RESPONSE_BODY_BYTES);
    });

    it('returns binary without a body for application/octet-stream', async () => {
        const url = await serve((_request, response) => {
            response.writeHead(200, { 'Content-Type': 'application/octet-stream' });
            response.end(Buffer.from([0, 1, 2, 3]));
        });

        const outcome = expectResponse(await sender.send({ method: HttpMethod.GET, url }));

        expect(outcome.binary).toBe(true);
        expect(outcome.body).toBeUndefined();
        expect(outcome.sizeBytes).toBe(4);
    });

    it('returns a timeout error when the target does not respond in time', async () => {
        await replaceSender({ SINGLE_REQUEST_TIMEOUT_MS: SHORT_TIMEOUT_MS });
        const url = await serve(() => {});

        const outcome = expectError(await sender.send({ method: HttpMethod.GET, url }));

        expect(outcome.error.category).toBe(SendErrorCategory.TIMEOUT);
        expect(outcome.durationMs).toBeGreaterThanOrEqual(SHORT_TIMEOUT_MS / 2);
    });

    it('returns connection_refused for a closed port', async () => {
        const closedServer = createServer();
        const url = await listen(closedServer);
        await close(closedServer);

        const outcome = expectError(await sender.send({ method: HttpMethod.GET, url }));

        expect(outcome.error.category).toBe(SendErrorCategory.CONNECTION_REFUSED);
    });

    it('rejects an IP literal in a private network without contacting it', async () => {
        await replaceSender(PRIVATE_NETWORKS_DENIED);
        const url = await serve(respondOk);

        const rejection: unknown = await sender
            .send({ method: HttpMethod.GET, url })
            .catch((error: unknown) => error);

        expectTargetNotAllowed(rejection);
        expect(connections).toBe(0);
    });

    it('rejects a host name that resolves to loopback without contacting it', async () => {
        await replaceSender(PRIVATE_NETWORKS_DENIED);
        const localUrl = await serve(respondOk);
        const url = localUrl.replace(LOCALHOST, LOCALHOST_NAME);

        const rejection: unknown = await sender
            .send({ method: HttpMethod.GET, url })
            .catch((error: unknown) => error);

        expectTargetNotAllowed(rejection);
        expect(connections).toBe(0);
    });

    it('sends to a private host listed in the allowed hosts', async () => {
        await replaceSender({
            ...PRIVATE_NETWORKS_DENIED,
            OUTBOUND_ALLOWED_HOSTS: [LOCALHOST_NAME],
        });
        const localUrl = await serve(respondOk);
        const url = localUrl.replace(LOCALHOST, LOCALHOST_NAME);

        const outcome = expectResponse(await sender.send({ method: HttpMethod.GET, url }));

        expect(outcome.status).toBe(200);
    });

    it('sends to a private address when private networks are allowed', async () => {
        const url = await serve(respondOk);

        const outcome = expectResponse(await sender.send({ method: HttpMethod.GET, url }));

        expect(outcome.status).toBe(200);
    });
});
