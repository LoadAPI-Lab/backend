import type { Type } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

export interface SwaggerOptions {
    readonly title: string;
    readonly description?: string;
    readonly version?: string;
    readonly path?: string;
    readonly extraModels?: Type<unknown>[];
}

export interface BootstrapOptions {
    readonly appModule: Type<unknown>;
    readonly apiVersion?: string;
    readonly swagger?: SwaggerOptions;
    readonly setupApp?: (app: NestFastifyApplication) => Promise<void> | void;
}
