export interface NewUserInput {
    readonly email: string;
    readonly name: string;
    readonly avatarUrl?: string;
    readonly now?: Date;
}

interface UserState {
    readonly id: string;
    readonly email: string;
    readonly name: string;
    readonly avatarUrl?: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export class User {
    private constructor(private readonly state: UserState) {}

    static create(input: NewUserInput): User {
        const now = input.now ?? new Date();
        return new User({
            id: crypto.randomUUID(),
            email: normalizeEmail(input.email),
            name: input.name,
            avatarUrl: input.avatarUrl,
            createdAt: now,
            updatedAt: now,
        });
    }

    static restore(props: UserState): User {
        return new User({ ...props });
    }

    get id(): string {
        return this.state.id;
    }

    get email(): string {
        return this.state.email;
    }

    get name(): string {
        return this.state.name;
    }

    get avatarUrl(): string | undefined {
        return this.state.avatarUrl;
    }

    get createdAt(): Date {
        return this.state.createdAt;
    }

    get updatedAt(): Date {
        return this.state.updatedAt;
    }
}
