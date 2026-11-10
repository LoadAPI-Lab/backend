import { SendErrorCategory } from '../../domain/constants';

const CATEGORIES_BY_CODE: ReadonlyMap<string, SendErrorCategory> = new Map([
    ['UND_ERR_CONNECT_TIMEOUT', SendErrorCategory.TIMEOUT],
    ['UND_ERR_HEADERS_TIMEOUT', SendErrorCategory.TIMEOUT],
    ['UND_ERR_BODY_TIMEOUT', SendErrorCategory.TIMEOUT],
    ['UND_ERR_ABORTED', SendErrorCategory.TIMEOUT],
    ['ETIMEDOUT', SendErrorCategory.TIMEOUT],
    ['ECONNREFUSED', SendErrorCategory.CONNECTION_REFUSED],
    ['ECONNRESET', SendErrorCategory.CONNECTION_RESET],
    ['UND_ERR_SOCKET', SendErrorCategory.CONNECTION_RESET],
    ['ENOTFOUND', SendErrorCategory.DNS],
    ['EAI_AGAIN', SendErrorCategory.DNS],
]);

const CATEGORIES_BY_NAME: ReadonlyMap<string, SendErrorCategory> = new Map([
    ['TimeoutError', SendErrorCategory.TIMEOUT],
    ['AbortError', SendErrorCategory.TIMEOUT],
]);

const MAX_CAUSE_DEPTH = 5;

const readStringProperty = (value: object, key: 'code' | 'name'): string | undefined => {
    const property: unknown = Reflect.get(value, key);
    return typeof property === 'string' ? property : undefined;
};

const categoryOf = (error: object): SendErrorCategory | undefined => {
    const code = readStringProperty(error, 'code');
    const name = readStringProperty(error, 'name');
    return (
        (code === undefined ? undefined : CATEGORIES_BY_CODE.get(code)) ??
        (name === undefined ? undefined : CATEGORIES_BY_NAME.get(name))
    );
};

const nestedErrorsOf = (error: object): unknown[] => [
    Reflect.get(error, 'cause'),
    ...(error instanceof AggregateError ? error.errors : []),
];

export function classifySendError(error: unknown, depth = 0): SendErrorCategory {
    if (typeof error !== 'object' || error === null || depth > MAX_CAUSE_DEPTH) {
        return SendErrorCategory.OTHER;
    }

    const category = categoryOf(error);
    if (category !== undefined) {
        return category;
    }

    for (const nested of nestedErrorsOf(error)) {
        const nestedCategory = classifySendError(nested, depth + 1);
        if (nestedCategory !== SendErrorCategory.OTHER) {
            return nestedCategory;
        }
    }

    return SendErrorCategory.OTHER;
}
