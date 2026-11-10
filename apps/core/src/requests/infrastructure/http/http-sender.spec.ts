import { createServer, type RequestListener, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import type { ConfigService } from '@nestjs/config';
import { HttpMethod } from '@shared/constants';

import {
    MAX_RESPONSE_BODY_BYTES,
    RequestOutcomeKind,
    SendErrorCategory,
} from '../../domain/constants';
import type { RequestOutcome } from '../../domain/request-outcome';
import { HttpSenderImpl } from './http-sender';

const DEFAULT_TIMEOUT_MS = 2000;
const SHORT_TIMEOUT_MS = 200;
const LOCALHOST = '127.0.0.1';
const EXTRA_BYTES = 100;

const configWithTimeout = (timeoutMs: number): ConfigService =>
    ({ getOrThrow: () => timeoutMs }) as unknown as ConfigService;

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

function expectError(outcome: RequestOutcome) {
    if (outcome.kind !== RequestOutcomeKind.ERROR) {
        throw new Error(`expected an error, got status ${outcome.status}`);
    }
    return outcome;
}

describe('HttpSenderImpl', () => {
    let server: Server | undefined;
    let sender: HttpSenderImpl;

    const serve = async (listener: RequestListener): Promise<string> => {
        server = createServer(listener);
        return listen(server);
    };

    beforeEach(() => {
        sender = new HttpSenderImpl(configWithTimeout(DEFAULT_TIMEOUT_MS));
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
        await sender.onModuleDestroy();
        sender = new HttpSenderImpl(configWithTimeout(SHORT_TIMEOUT_MS));
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
});
