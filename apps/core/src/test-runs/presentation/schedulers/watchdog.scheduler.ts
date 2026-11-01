import {
    Injectable,
    Logger,
    type OnApplicationBootstrap,
    type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describeError } from '@shared/error';

import { ExpireStaleTestRunsUseCase } from '../../application/use-cases';

@Injectable()
export class WatchdogScheduler implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly logger = new Logger(WatchdogScheduler.name);
    private readonly intervalMs: number;
    private timer?: NodeJS.Timeout;
    private isTickRunning = false;

    constructor(
        private readonly expireStaleTestRuns: ExpireStaleTestRunsUseCase,
        configService: ConfigService,
    ) {
        this.intervalMs = configService.getOrThrow('WATCHDOG_INTERVAL_MS');
    }

    onApplicationBootstrap() {
        this.timer = setInterval(() => {
            void this.tick();
        }, this.intervalMs);
    }

    onModuleDestroy() {
        clearInterval(this.timer);
    }

    private async tick() {
        if (this.isTickRunning) {
            return;
        }

        this.isTickRunning = true;
        try {
            const expiredCount = await this.expireStaleTestRuns.execute(new Date());
            if (expiredCount) {
                this.logger.warn(`Expired ${expiredCount} stale test run(s)`);
            }
        } catch (error) {
            this.logger.error(`Watchdog tick failed: ${describeError(error)}`);
        } finally {
            this.isTickRunning = false;
        }
    }
}
