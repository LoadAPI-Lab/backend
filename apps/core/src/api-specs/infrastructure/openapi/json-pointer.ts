const ROOT_FIELD = 'content';

const unescapeSegment = (segment: string): string =>
    segment.replaceAll('~1', '/').replaceAll('~0', '~');

const pointerSegments = (pointer: string): string[] => {
    const [, ...tokens] = pointer.split('/');
    return tokens.map(unescapeSegment);
};

export const toDotPath = (pointer: string | string[] | undefined): string => {
    const segments = Array.isArray(pointer) ? pointer : pointerSegments(pointer ?? '');
    return segments.length ? segments.join('.') : ROOT_FIELD;
};
