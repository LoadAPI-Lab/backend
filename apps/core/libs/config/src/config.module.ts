import * as path from 'node:path';

import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { z } from 'zod/v4';

import { ConfigSchema } from './config.schema';

function validateConfig(env: Record<string, unknown>) {
    const result = ConfigSchema.safeParse(env);
    if (!result.success) {
        throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
    }
    return result.data;
}

@Module({
    exports: [NestConfigModule],
    imports: [
        NestConfigModule.forRoot({
            isGlobal: true,
            envFilePath: path.resolve(process.cwd(), '.env'),
            validate: validateConfig,
        }),
    ],
})
export class ConfigModule {}
