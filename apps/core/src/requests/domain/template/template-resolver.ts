import { randomBytes, randomInt, randomUUID } from 'node:crypto';

import type { HttpRequest } from '@shared/http-request';

import { TemplateGenerator } from '../constants';

const PLACEHOLDER_RE = /\{\{\$?\w+\}\}/g;
const PLACEHOLDER_DELIMITER_LENGTH = 2;
const GENERATOR_PREFIX = '$';
const RANDOM_INT_EXCLUSIVE_MAX = 1_000_000;
const RANDOM_EMAIL_LOCAL_PREFIX = 'user_';
const RANDOM_EMAIL_DOMAIN = '@example.com';
const RANDOM_EMAIL_ID_BYTES = 8;
const RANDOM_EMAIL_ID_RADIX = 36;
const MILLISECONDS_PER_SECOND = 1000;

const GENERATORS: ReadonlyMap<string, () => string> = new Map<TemplateGenerator, () => string>([
    [TemplateGenerator.UUID, () => randomUUID()],
    [TemplateGenerator.RANDOM_INT, () => String(randomInt(RANDOM_INT_EXCLUSIVE_MAX))],
    [
        TemplateGenerator.RANDOM_EMAIL,
        () =>
            RANDOM_EMAIL_LOCAL_PREFIX +
            randomBytes(RANDOM_EMAIL_ID_BYTES).readBigUInt64BE().toString(RANDOM_EMAIL_ID_RADIX) +
            RANDOM_EMAIL_DOMAIN,
    ],
    [TemplateGenerator.TIMESTAMP, () => String(Math.floor(Date.now() / MILLISECONDS_PER_SECOND))],
]);

export function resolveTemplate(text: string): string {
    return text.replace(PLACEHOLDER_RE, (placeholder) => {
        const name = placeholder.slice(PLACEHOLDER_DELIMITER_LENGTH, -PLACEHOLDER_DELIMITER_LENGTH);
        if (!name.startsWith(GENERATOR_PREFIX)) {
            return placeholder;
        }
        const generate = GENERATORS.get(name.slice(GENERATOR_PREFIX.length));
        return generate?.() ?? placeholder;
    });
}

export function resolveRequestTemplates(request: HttpRequest): HttpRequest {
    return {
        ...request,
        url: resolveTemplate(request.url),
        ...(request.headers !== undefined && {
            headers: Object.fromEntries(
                Object.entries(request.headers).map(([name, value]) => [
                    name,
                    resolveTemplate(value),
                ]),
            ),
        }),
        ...(request.body !== undefined && { body: resolveTemplate(request.body) }),
    };
}
