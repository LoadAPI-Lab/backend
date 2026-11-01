import { z } from 'zod/v4';

import type { TestRunPageCursor } from '../../domain/repositories';

const CURSOR_ENCODING = 'base64url';
const MIN_CREATED_AT_YEAR = 1;

const testRunCursorSchema = z.object({
    createdAt: z.iso
        .datetime()
        .refine((value) => new Date(value).getUTCFullYear() >= MIN_CREATED_AT_YEAR),
    id: z.uuid(),
});

const parseJson = (text: string): unknown => {
    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
};

export const encodeTestRunCursor = (cursor: TestRunPageCursor): string =>
    Buffer.from(JSON.stringify(cursor)).toString(CURSOR_ENCODING);

export const decodeTestRunCursor = (encoded: string): TestRunPageCursor | undefined => {
    const decoded = parseJson(Buffer.from(encoded, CURSOR_ENCODING).toString());

    return testRunCursorSchema.safeParse(decoded).data;
};
