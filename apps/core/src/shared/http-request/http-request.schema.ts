import { z } from 'zod/v4';

import { HTTP_METHODS } from '../constants';

const PATH_PARAM_RE = /^(?::\w+|\{\w+\})$/;
const HOST_BRACE_RE = /[{}]/;

function findUnresolvedPathParam(url: string): string | undefined {
    const withoutFragment = url.replace(/#.*$/, '');
    const withoutQuery = withoutFragment.replace(/\?.*$/, '');
    return withoutQuery.split('/').find((segment) => PATH_PARAM_RE.test(segment));
}

function tryParseUrl(url: string): URL | undefined {
    try {
        return new URL(url);
    } catch {
        return undefined;
    }
}

const urlSchema = z
    .string()
    .trim()
    .superRefine((url, ctx) => {
        const parsed = tryParseUrl(url);
        if (parsed === undefined) {
            ctx.addIssue({ code: 'custom', message: `invalid url "${url}"` });
            return;
        }

        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            ctx.addIssue({
                code: 'custom',
                message: `url "${url}" must start with http:// or https://`,
            });
            return;
        }

        if (parsed.host === '') {
            ctx.addIssue({ code: 'custom', message: `url "${url}" has no host` });
            return;
        }

        if (HOST_BRACE_RE.test(parsed.hostname)) {
            ctx.addIssue({ code: 'custom', message: `url "${url}" has "{" or "}" in the host` });
            return;
        }

        const unresolved = findUnresolvedPathParam(url);
        if (unresolved !== undefined) {
            ctx.addIssue({
                code: 'custom',
                message: `url "${url}" has unresolved path parameter "${unresolved}"`,
            });
        }
    });

export const httpRequestSchema = z.object({
    method: z.enum(HTTP_METHODS, {
        error: (issue) => `unsupported method ${JSON.stringify(issue.input)}`,
    }),
    url: urlSchema,
    headers: z.record(z.string(), z.string()).optional(),
    body: z.string().optional(),
});

export type HttpRequest = z.infer<typeof httpRequestSchema>;
