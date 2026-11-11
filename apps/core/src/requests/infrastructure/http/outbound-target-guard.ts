import { type LookupAddress, lookup as resolveHost } from 'node:dns';
import { isIP, type LookupFunction } from 'node:net';

import { isBlockedAddress } from './address-policy';

const IPV6_LITERAL_BRACKETS = /^\[|\]$/g;
const NOT_AN_IP = 0;

export class TargetNotAllowedError extends Error {
    override readonly name = 'TargetNotAllowedError';
}

export class OutboundTargetGuard {
    private readonly allowedHosts: ReadonlySet<string>;

    constructor(allowedHosts: readonly string[]) {
        this.allowedHosts = new Set(allowedHosts.map((host) => host.toLowerCase()));
    }

    assertAllowedUrl(url: string): void {
        const host = new URL(url).hostname.replace(IPV6_LITERAL_BRACKETS, '');
        if (isIP(host) !== NOT_AN_IP && !this.isHostAllowed(host) && isBlockedAddress(host)) {
            throw new TargetNotAllowedError();
        }
    }

    readonly lookup: LookupFunction = (hostname, options, callback) => {
        if (this.isHostAllowed(hostname)) {
            resolveHost(hostname, options, callback);
            return;
        }

        resolveHost(hostname, { ...options, all: true }, (error, addresses: LookupAddress[]) => {
            if (error) {
                callback(error, []);
                return;
            }
            if (addresses.some(({ address }) => isBlockedAddress(address))) {
                callback(new TargetNotAllowedError(), []);
                return;
            }
            const [first] = addresses;
            if (options.all || first === undefined) {
                callback(null, addresses);
                return;
            }
            callback(null, first.address, first.family);
        });
    };

    private isHostAllowed(host: string): boolean {
        return this.allowedHosts.has(host.toLowerCase());
    }
}
