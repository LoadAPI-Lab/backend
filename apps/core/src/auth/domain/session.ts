const MS_PER_SECOND = 1000;

export interface NewSessionInput {
    readonly userId: string;
    readonly ttlSeconds: number;
    readonly now?: Date;
}

interface SessionState {
    readonly id: string;
    readonly userId: string;
    refreshJti: string;
    expiresAt: Date;
    revokedAt?: Date;
    readonly createdAt: Date;
    updatedAt: Date;
}

const expiresAfter = (now: Date, ttlSeconds: number): Date =>
    new Date(now.getTime() + ttlSeconds * MS_PER_SECOND);

export class Session {
    private constructor(private readonly state: SessionState) {}

    static create(input: NewSessionInput): Session {
        const now = input.now ?? new Date();
        return new Session({
            id: crypto.randomUUID(),
            userId: input.userId,
            refreshJti: crypto.randomUUID(),
            expiresAt: expiresAfter(now, input.ttlSeconds),
            createdAt: now,
            updatedAt: now,
        });
    }

    static restore(props: {
        id: string;
        userId: string;
        refreshJti: string;
        expiresAt: Date;
        revokedAt?: Date;
        createdAt: Date;
        updatedAt: Date;
    }): Session {
        return new Session({ ...props });
    }

    get id(): string {
        return this.state.id;
    }

    get userId(): string {
        return this.state.userId;
    }

    get refreshJti(): string {
        return this.state.refreshJti;
    }

    get expiresAt(): Date {
        return this.state.expiresAt;
    }

    get revokedAt(): Date | undefined {
        return this.state.revokedAt;
    }

    get createdAt(): Date {
        return this.state.createdAt;
    }

    get updatedAt(): Date {
        return this.state.updatedAt;
    }

    isActive(now: Date): boolean {
        return this.state.revokedAt === undefined && this.state.expiresAt > now;
    }

    rotate(now: Date, ttlSeconds: number): void {
        this.state.refreshJti = crypto.randomUUID();
        this.state.expiresAt = expiresAfter(now, ttlSeconds);
        this.state.updatedAt = now;
    }
}
