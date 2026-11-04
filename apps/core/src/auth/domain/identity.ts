import type { OAuthProvider } from './constants';

export interface NewIdentityInput {
    readonly userId: string;
    readonly provider: OAuthProvider;
    readonly providerUserId: string;
    readonly now?: Date;
}

interface IdentityState {
    readonly id: string;
    readonly userId: string;
    readonly provider: OAuthProvider;
    readonly providerUserId: string;
    readonly createdAt: Date;
}

export class Identity {
    private constructor(private readonly state: IdentityState) {}

    static create(input: NewIdentityInput): Identity {
        return new Identity({
            id: crypto.randomUUID(),
            userId: input.userId,
            provider: input.provider,
            providerUserId: input.providerUserId,
            createdAt: input.now ?? new Date(),
        });
    }

    static restore(props: IdentityState): Identity {
        return new Identity({ ...props });
    }

    get id(): string {
        return this.state.id;
    }

    get userId(): string {
        return this.state.userId;
    }

    get provider(): OAuthProvider {
        return this.state.provider;
    }

    get providerUserId(): string {
        return this.state.providerUserId;
    }

    get createdAt(): Date {
        return this.state.createdAt;
    }
}
