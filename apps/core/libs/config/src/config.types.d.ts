import '@nestjs/config';
import { Config } from './config.schema';

declare module '@nestjs/config' {
    interface ConfigService<_K = unknown, _WasValidated extends boolean = false> {
        get<T extends keyof Config>(key: T): Config[T];
        get<T extends keyof Config>(key: T, defaultValue: Config[T]): Config[T];
        getOrThrow<T extends keyof Config>(key: T): Config[T];
    }
}
