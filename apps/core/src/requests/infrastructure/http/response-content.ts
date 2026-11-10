import type { ResponseHeader } from '../../domain/request-outcome';

const CONTENT_TYPE_HEADER = 'content-type';
const TEXT_MEDIA_TYPE_PREFIX = 'text/';
const TEXT_MEDIA_TYPE_SUFFIXES = ['+json', '+xml'] as const;
const TEXT_MEDIA_TYPES: ReadonlySet<string> = new Set([
    'application/json',
    'application/xml',
    'application/javascript',
    'application/x-www-form-urlencoded',
]);

export function toResponseHeaders(rawHeaders: unknown): ResponseHeader[] {
    if (!Array.isArray(rawHeaders)) {
        return [];
    }

    const headers: ResponseHeader[] = [];
    for (let index = 0; index + 1 < rawHeaders.length; index += 2) {
        headers.push({ name: String(rawHeaders[index]), value: String(rawHeaders[index + 1]) });
    }
    return headers;
}

export function isTextContent(headers: readonly ResponseHeader[]): boolean {
    const contentType = headers.find(
        (header) => header.name.toLowerCase() === CONTENT_TYPE_HEADER,
    )?.value;
    if (contentType === undefined) {
        return true;
    }

    const [essence = ''] = contentType.split(';');
    const mediaType = essence.trim().toLowerCase();
    return (
        mediaType === '' ||
        mediaType.startsWith(TEXT_MEDIA_TYPE_PREFIX) ||
        TEXT_MEDIA_TYPES.has(mediaType) ||
        TEXT_MEDIA_TYPE_SUFFIXES.some((suffix) => mediaType.endsWith(suffix))
    );
}
