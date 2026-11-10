import { BlockList, isIP } from 'node:net';

import { type AddressFamily, BLOCKED_ADDRESS_RANGES } from './blocked-address-ranges';

const IPV4_VERSION = 4;
const IPV6_VERSION = 6;

const FAMILIES_BY_IP_VERSION: ReadonlyMap<number, AddressFamily> = new Map([
    [IPV4_VERSION, 'ipv4'],
    [IPV6_VERSION, 'ipv6'],
]);

const blockedAddresses = new BlockList();
for (const range of BLOCKED_ADDRESS_RANGES) {
    blockedAddresses.addSubnet(range.network, range.prefix, range.family);
}

export function isBlockedAddress(address: string): boolean {
    const family = FAMILIES_BY_IP_VERSION.get(isIP(address));
    return family !== undefined && blockedAddresses.check(address, family);
}
