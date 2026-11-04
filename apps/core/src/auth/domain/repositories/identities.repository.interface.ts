import type { OAuthProvider } from '../constants';
import type { Identity } from '../identity';

export abstract class IdentitiesRepository {
    abstract create(identity: Identity): Promise<void>;
    abstract findByProvider(
        provider: OAuthProvider,
        providerUserId: string,
    ): Promise<Identity | null>;
}
