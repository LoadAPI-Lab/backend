import {
    AUTHORIZATION_HEADER_NAMES,
    MASKED_VALUE,
    SECRET_HEADER_NAME_PARTS,
    SECRET_HEADER_NAMES,
    SECRET_QUERY_PARAM_NAME_PARTS,
    SECRET_QUERY_PARAM_NAMES,
} from './constants';
import type { Target } from './schemas';
import type { TestRunConfig } from './test-run';

const PLACEHOLDER_RE = /\{\{\$?\w+\}\}/g;
const AUTHORIZATION_SCHEME_RE = /^(?<scheme>[A-Za-z][\w-]*)\s+(?<credentials>\S[\s\S]*)$/;
const QUERY_START = '?';
const FRAGMENT_START = '#';
const PARAM_SEPARATOR = '&';
const NAME_VALUE_SEPARATOR = '=';
const NOT_FOUND_INDEX = -1;
const TEXT_START = 0;

const isSecretName = (
    name: string,
    exactNames: readonly string[],
    nameParts: readonly string[],
): boolean => {
    const normalized = name.toLowerCase();
    return exactNames.includes(normalized) || nameParts.some((part) => normalized.includes(part));
};

const isPlaceholderOnly = (text: string): boolean =>
    text.trim() !== '' && text.replace(PLACEHOLDER_RE, '').trim() === '';

const decodeQueryComponent = (component: string): string => {
    try {
        return decodeURIComponent(component.replaceAll('+', ' '));
    } catch {
        return component;
    }
};

const isParsableUrl = (url: string): boolean => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

const splitAt = (text: string, separator: string): [string, string] => {
    const index = text.indexOf(separator);
    if (index === NOT_FOUND_INDEX) {
        return [text, ''];
    }

    return [text.slice(TEXT_START, index), text.slice(index)];
};

const maskHeaderValue = (name: string, value: string): string => {
    const isAuthorization = (AUTHORIZATION_HEADER_NAMES as readonly string[]).includes(
        name.toLowerCase(),
    );
    const groups = AUTHORIZATION_SCHEME_RE.exec(value)?.groups;
    const scheme = groups?.['scheme'];
    const credentials = groups?.['credentials'];

    if (isAuthorization && scheme !== undefined && credentials !== undefined) {
        if (isPlaceholderOnly(credentials)) {
            return value;
        }

        return `${scheme} ${MASKED_VALUE}`;
    }

    if (isPlaceholderOnly(value)) {
        return value;
    }

    return MASKED_VALUE;
};

const maskHeader = ([name, value]: [string, string]): [string, string] => {
    if (!isSecretName(name, SECRET_HEADER_NAMES, SECRET_HEADER_NAME_PARTS)) {
        return [name, value];
    }

    return [name, maskHeaderValue(name, value)];
};

const maskHeaders = (headers: Record<string, string>): Record<string, string> =>
    Object.fromEntries(Object.entries(headers).map(maskHeader));

const maskQueryParam = (param: string): string => {
    const [name, separatorAndValue] = splitAt(param, NAME_VALUE_SEPARATOR);
    if (separatorAndValue === '') {
        return param;
    }

    const value = separatorAndValue.slice(NAME_VALUE_SEPARATOR.length);
    const isSecret = isSecretName(
        decodeQueryComponent(name),
        SECRET_QUERY_PARAM_NAMES,
        SECRET_QUERY_PARAM_NAME_PARTS,
    );

    if (!isSecret || isPlaceholderOnly(decodeQueryComponent(value))) {
        return param;
    }

    return `${name}${NAME_VALUE_SEPARATOR}${MASKED_VALUE}`;
};

export const maskUrl = (url: string): string => {
    if (!isParsableUrl(url)) {
        return url;
    }

    const [withoutFragment, fragment] = splitAt(url, FRAGMENT_START);
    const [beforeQuery, queryWithStart] = splitAt(withoutFragment, QUERY_START);

    if (queryWithStart === '') {
        return url;
    }

    const maskedQuery = queryWithStart
        .slice(QUERY_START.length)
        .split(PARAM_SEPARATOR)
        .map(maskQueryParam)
        .join(PARAM_SEPARATOR);

    return `${beforeQuery}${QUERY_START}${maskedQuery}${fragment}`;
};

const maskTarget = (target: Target): Target => ({
    ...target,
    url: maskUrl(target.url),
    ...(target.headers !== undefined && { headers: maskHeaders(target.headers) }),
});

export const maskTestRunConfig = (config: TestRunConfig): TestRunConfig => {
    if ('steps' in config) {
        return {
            steps: config.steps.map((step) => ({
                ...step,
                target: maskTarget(step.target),
                ...(step.extract !== undefined && {
                    extract: step.extract.map((rule) => ({ ...rule })),
                }),
            })),
        };
    }

    return { ...config, target: maskTarget(config.target) };
};
