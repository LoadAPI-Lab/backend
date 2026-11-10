export const RequestHeaderViolation = {
    INVALID_NAME: 'header_invalid_name',
    INVALID_VALUE: 'header_invalid_value',
    FORBIDDEN: 'header_forbidden',
} as const;
export type RequestHeaderViolation =
    (typeof RequestHeaderViolation)[keyof typeof RequestHeaderViolation];

export const REQUEST_HEADER_VIOLATION_MESSAGES: Record<
    RequestHeaderViolation,
    (headerName: string) => string
> = {
    [RequestHeaderViolation.INVALID_NAME]: (headerName) =>
        `header name ${JSON.stringify(headerName)} is not a valid HTTP token`,
    [RequestHeaderViolation.INVALID_VALUE]: (headerName) =>
        `header ${JSON.stringify(headerName)} has a value with CR, LF or NUL characters`,
    [RequestHeaderViolation.FORBIDDEN]: (headerName) =>
        `header ${JSON.stringify(headerName)} is controlled by the client and cannot be set`,
};
