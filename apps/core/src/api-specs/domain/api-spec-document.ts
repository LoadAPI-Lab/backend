import type { ApiSpecMethod, BodyFieldType, ParameterLocation } from './constants';

export interface ApiSpecServerVariable {
    readonly default: string;
    readonly enum?: string[];
    readonly description?: string;
}

export interface ApiSpecServer {
    readonly url: string;
    readonly relative?: true;
    readonly template?: string;
    readonly variables?: Record<string, ApiSpecServerVariable>;
}

export interface ApiSpecParameterSchema {
    readonly type?: string;
    readonly format?: string;
    readonly enum?: unknown[];
    readonly default?: unknown;
    readonly example?: unknown;
}

export interface ApiSpecParameter {
    readonly name: string;
    readonly in: ParameterLocation;
    readonly required: boolean;
    readonly description?: string;
    readonly schema: ApiSpecParameterSchema;
    readonly example?: string;
}

export interface ApiSpecBodyField {
    readonly path: string;
    readonly type: BodyFieldType;
    readonly format?: string;
    readonly required: boolean;
}

export interface ApiSpecRequestBody {
    readonly required: boolean;
    readonly contentType: string;
    readonly example?: string;
    readonly fields?: ApiSpecBodyField[];
}

export interface ApiSpecEndpointResponse {
    readonly status: string;
    readonly description: string;
}

export interface ApiSpecEndpoint {
    readonly id: string;
    readonly key: string;
    readonly method: ApiSpecMethod;
    readonly path: string;
    readonly summary?: string;
    readonly description?: string;
    readonly tags: string[];
    readonly deprecated?: true;
    readonly parameters: ApiSpecParameter[];
    readonly requestBody?: ApiSpecRequestBody;
    readonly responses: ApiSpecEndpointResponse[];
}

export interface ParsedApiSpec {
    readonly title: string;
    readonly version: string;
    readonly description?: string;
    readonly servers: ApiSpecServer[];
    readonly endpoints: ApiSpecEndpoint[];
}
