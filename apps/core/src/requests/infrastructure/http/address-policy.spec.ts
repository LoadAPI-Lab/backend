import { isBlockedAddress } from './address-policy';

const BLOCKED_ADDRESSES = [
    '127.0.0.1',
    '10.1.2.3',
    '172.20.0.5',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '::1',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
];

const ALLOWED_ADDRESSES = ['93.184.216.34', '2606:4700::1111'];

describe('isBlockedAddress', () => {
    it.each(BLOCKED_ADDRESSES)('blocks %s', (address) => {
        expect(isBlockedAddress(address)).toBe(true);
    });

    it.each(ALLOWED_ADDRESSES)('allows %s', (address) => {
        expect(isBlockedAddress(address)).toBe(false);
    });
});
