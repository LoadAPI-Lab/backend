import type { ApiSpecEndpoint, ApiSpecServer, ParsedApiSpec } from './api-spec-document';

export interface NewApiSpecInput extends ParsedApiSpec {
    readonly userId: string;
    readonly name: string;
    readonly source: string;
    readonly now?: Date;
}

export interface ReplaceApiSpecContentInput extends ParsedApiSpec {
    readonly name?: string;
    readonly source: string;
    readonly now?: Date;
}

interface ApiSpecState {
    readonly id: string;
    readonly userId: string;
    readonly name: string;
    readonly title: string;
    readonly version: string;
    readonly description?: string;
    readonly source: string;
    readonly servers: ApiSpecServer[];
    readonly endpoints: ApiSpecEndpoint[];
    readonly createdAt: Date;
    readonly updatedAt: Date;
}

export interface ApiSpecSummary {
    readonly id: string;
    readonly name: string;
    readonly title: string;
    readonly version: string;
    readonly endpointsCount: number;
    readonly createdAt: Date;
}

export class ApiSpec {
    private constructor(private readonly state: ApiSpecState) {}

    static create(input: NewApiSpecInput): ApiSpec {
        const now = input.now ?? new Date();
        return new ApiSpec({
            id: crypto.randomUUID(),
            userId: input.userId,
            name: input.name,
            title: input.title,
            version: input.version,
            description: input.description,
            source: input.source,
            servers: input.servers,
            endpoints: input.endpoints,
            createdAt: now,
            updatedAt: now,
        });
    }

    replaceContent(input: ReplaceApiSpecContentInput): ApiSpec {
        return new ApiSpec({
            ...this.state,
            name: input.name ?? this.state.name,
            title: input.title,
            version: input.version,
            description: input.description,
            source: input.source,
            servers: input.servers,
            endpoints: input.endpoints,
            updatedAt: input.now ?? new Date(),
        });
    }

    static restore(props: ApiSpecState): ApiSpec {
        return new ApiSpec({ ...props });
    }

    get id(): string {
        return this.state.id;
    }

    get userId(): string {
        return this.state.userId;
    }

    get name(): string {
        return this.state.name;
    }

    get title(): string {
        return this.state.title;
    }

    get version(): string {
        return this.state.version;
    }

    get description(): string | undefined {
        return this.state.description;
    }

    get source(): string {
        return this.state.source;
    }

    get servers(): ApiSpecServer[] {
        return this.state.servers;
    }

    get endpoints(): ApiSpecEndpoint[] {
        return this.state.endpoints;
    }

    get endpointsCount(): number {
        return this.state.endpoints.length;
    }

    get createdAt(): Date {
        return this.state.createdAt;
    }

    get updatedAt(): Date {
        return this.state.updatedAt;
    }

    toSummary(): ApiSpecSummary {
        return {
            id: this.state.id,
            name: this.state.name,
            title: this.state.title,
            version: this.state.version,
            endpointsCount: this.endpointsCount,
            createdAt: this.state.createdAt,
        };
    }
}
