export const SendErrorCategory = {
    TIMEOUT: 'timeout',
    CONNECTION_REFUSED: 'connection_refused',
    CONNECTION_RESET: 'connection_reset',
    DNS: 'dns',
    OTHER: 'other',
} as const;
export type SendErrorCategory = (typeof SendErrorCategory)[keyof typeof SendErrorCategory];

export const SEND_ERROR_CATEGORIES = [
    SendErrorCategory.TIMEOUT,
    SendErrorCategory.CONNECTION_REFUSED,
    SendErrorCategory.CONNECTION_RESET,
    SendErrorCategory.DNS,
    SendErrorCategory.OTHER,
] as const;

export const SEND_ERROR_MESSAGES: Record<SendErrorCategory, string> = {
    [SendErrorCategory.TIMEOUT]: 'The request timed out before the response was received.',
    [SendErrorCategory.CONNECTION_REFUSED]: 'The target refused the connection.',
    [SendErrorCategory.CONNECTION_RESET]: 'The connection was reset by the target.',
    [SendErrorCategory.DNS]: 'The host name of the target could not be resolved.',
    [SendErrorCategory.OTHER]: 'The request could not be sent.',
};
