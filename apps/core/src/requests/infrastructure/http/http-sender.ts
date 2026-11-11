import { performance } from 'node:perf_hooks';
import type { Readable } from 'node:stream';

import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { HttpRequest } from '@shared/http-request';
import { Agent, request } from 'undici';

import {
    MAX_RESPONSE_BODY_BYTES,
    RequestOutcomeKind,
    SEND_ERROR_MESSAGES,
} from '../../domain/constants';
import { RequestErrorCodes, requestException } from '../../domain/errors';
import { HttpSender } from '../../domain/ports';
import type { FailedRequest, ReceivedResponse, RequestOutcome } from '../../domain/request-outcome';
import { OutboundTargetGuard, TargetNotAllowedError } from './outbound-target-guard';
import { isTextContent, toResponseHeaders } from './response-content';
import { classifySendError } from './send-error-classification';

const RAW_RESPONSE_HEADERS = 'raw';

interface ReadBody {
    readonly bytes: Buffer;
    readonly truncated: boolean;
}

async function readLimitedBody(body: Readable, limitBytes: number): Promise<ReadBody> {
    const chunks: Buffer[] = [];
    let sizeBytes = 0;
    let truncated = false;

    for await (const chunk of body as AsyncIterable<Buffer>) {
        const remainingBytes = limitBytes - sizeBytes;
        if (chunk.length > remainingBytes) {
            chunks.push(chunk.subarray(0, remainingBytes));
            sizeBytes += remainingBytes;
            truncated = true;
            break;
        }
        chunks.push(chunk);
        sizeBytes += chunk.length;
    }

    if (truncated) {
        body.destroy();
    }

    return { bytes: Buffer.concat(chunks, sizeBytes), truncated };
}

const decodeText = (bytes: Buffer, truncated: boolean): string =>
    new TextDecoder().decode(bytes, { stream: truncated });

@Injectable()
export class HttpSenderImpl implements HttpSender, OnModuleDestroy {
    private readonly timeoutMs: number;
    private readonly targetGuard?: OutboundTargetGuard;
    private readonly agent: Agent;

    constructor(configService: ConfigService) {
        this.timeoutMs = configService.getOrThrow('SINGLE_REQUEST_TIMEOUT_MS');
        if (!configService.getOrThrow('OUTBOUND_ALLOW_PRIVATE_NETWORKS')) {
            this.targetGuard = new OutboundTargetGuard(
                configService.getOrThrow('OUTBOUND_ALLOWED_HOSTS'),
            );
        }
        this.agent = new Agent({
            connectTimeout: this.timeoutMs,
            headersTimeout: this.timeoutMs,
            bodyTimeout: this.timeoutMs,
            ...(this.targetGuard && { connect: { lookup: this.targetGuard.lookup } }),
        });
    }

    async onModuleDestroy(): Promise<void> {
        await this.agent.close();
    }

    async send(httpRequest: HttpRequest): Promise<RequestOutcome> {
        const startedAt = performance.now();

        try {
            this.targetGuard?.assertAllowedUrl(httpRequest.url);
            const response = await request(httpRequest.url, {
                dispatcher: this.agent,
                method: httpRequest.method,
                headers: httpRequest.headers,
                body: httpRequest.body,
                signal: AbortSignal.timeout(this.timeoutMs),
                responseHeaders: RAW_RESPONSE_HEADERS,
            });

            const headers = toResponseHeaders(response.headers);
            const { bytes, truncated } = await readLimitedBody(
                response.body,
                MAX_RESPONSE_BODY_BYTES,
            );
            const durationMs = performance.now() - startedAt;
            const text = isTextContent(headers);

            const received: ReceivedResponse = {
                kind: RequestOutcomeKind.RESPONSE,
                status: response.statusCode,
                ...(response.statusText && { statusText: response.statusText }),
                headers,
                ...(text && bytes.length > 0 && { body: decodeText(bytes, truncated) }),
                ...(!text && { binary: true }),
                ...(truncated && { bodyTruncated: true }),
                sizeBytes: bytes.length,
                durationMs,
            };
            return received;
        } catch (error) {
            if (error instanceof TargetNotAllowedError) {
                throw requestException(RequestErrorCodes.TARGET_NOT_ALLOWED);
            }
            const category = classifySendError(error);
            const failed: FailedRequest = {
                kind: RequestOutcomeKind.ERROR,
                durationMs: performance.now() - startedAt,
                error: { category, message: SEND_ERROR_MESSAGES[category] },
            };
            return failed;
        }
    }
}
