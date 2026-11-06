import { createHash } from 'node:crypto';

import { ENDPOINT_ID_LENGTH } from '../../domain/constants';

const DIGEST_START_INDEX = 0;

export const endpointId = (key: string): string =>
    createHash('sha256')
        .update(key)
        .digest('base64url')
        .slice(DIGEST_START_INDEX, ENDPOINT_ID_LENGTH);
