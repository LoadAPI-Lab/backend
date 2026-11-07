import type { ApiSpec, ApiSpecSummary } from '../api-spec';

export interface RenameApiSpecInput {
    readonly id: string;
    readonly userId: string;
    readonly name: string;
    readonly updatedAt: Date;
}

export abstract class ApiSpecsRepository {
    abstract create(spec: ApiSpec): Promise<void>;
    abstract findByIdForUser(id: string, userId: string): Promise<ApiSpec | null>;
    abstract listForUser(userId: string): Promise<ApiSpecSummary[]>;
    abstract updateName(input: RenameApiSpecInput): Promise<ApiSpecSummary | null>;
    abstract updateContent(spec: ApiSpec): Promise<boolean>;
    abstract deleteForUser(id: string, userId: string): Promise<boolean>;
}
