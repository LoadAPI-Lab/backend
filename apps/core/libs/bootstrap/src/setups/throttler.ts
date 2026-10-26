import { Module, type Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

export function withThrottler(appModule: Type<unknown>): Type<unknown> {
    @Module({
        imports: [
            appModule,
            ThrottlerModule.forRootAsync({
                inject: [ConfigService],
                useFactory: (cfg: ConfigService) => [
                    {
                        ttl: cfg.get('THROTTLE_TTL_MS'),
                        limit: cfg.get('THROTTLE_LIMIT'),
                        skipIf: (context) => context.getType() !== 'http',
                    },
                ],
            }),
        ],
        providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    })
    class RootModule {}

    return RootModule;
}
