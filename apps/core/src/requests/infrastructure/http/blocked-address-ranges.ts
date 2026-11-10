export type AddressFamily = 'ipv4' | 'ipv6';

export interface AddressRange {
    readonly network: string;
    readonly prefix: number;
    readonly family: AddressFamily;
}

export const BLOCKED_ADDRESS_RANGES: readonly AddressRange[] = [
    { network: '0.0.0.0', prefix: 8, family: 'ipv4' },
    { network: '10.0.0.0', prefix: 8, family: 'ipv4' },
    { network: '100.64.0.0', prefix: 10, family: 'ipv4' },
    { network: '127.0.0.0', prefix: 8, family: 'ipv4' },
    { network: '169.254.0.0', prefix: 16, family: 'ipv4' },
    { network: '172.16.0.0', prefix: 12, family: 'ipv4' },
    { network: '192.0.0.0', prefix: 24, family: 'ipv4' },
    { network: '192.168.0.0', prefix: 16, family: 'ipv4' },
    { network: '198.18.0.0', prefix: 15, family: 'ipv4' },
    { network: '224.0.0.0', prefix: 4, family: 'ipv4' },
    { network: '240.0.0.0', prefix: 4, family: 'ipv4' },
    { network: '::', prefix: 128, family: 'ipv6' },
    { network: '::1', prefix: 128, family: 'ipv6' },
    { network: 'fc00::', prefix: 7, family: 'ipv6' },
    { network: 'fe80::', prefix: 10, family: 'ipv6' },
    { network: 'ff00::', prefix: 8, family: 'ipv6' },
];
