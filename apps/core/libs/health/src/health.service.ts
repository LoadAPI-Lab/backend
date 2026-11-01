import { Inject, Injectable } from '@nestjs/common';

import { MODULE_OPTIONS_TOKEN } from './health.module-definition';
import type { HealthModuleOptions } from './interfaces';

@Injectable()
export class HealthService {
    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: HealthModuleOptions,
    ) {}

    async getHealthData() {
        const { serviceName, version = 'v1.0.0', indicators = {} } = this.options;

        const results = await Promise.all(
            Object.entries(indicators).map(async ([name, check]) => {
                if (!check || typeof check !== 'function') {
                    return { name, ok: false, error: 'Health check not configured' };
                }

                let timeoutId: NodeJS.Timeout | undefined;

                const timeoutPromise = new Promise((_, reject) => {
                    timeoutId = setTimeout(() => reject(new Error('Timeout')), 5000);
                });

                try {
                    const result = await Promise.race([check(), timeoutPromise]);
                    return { name, ok: Boolean(result) };
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    return { name, ok: false, error: message };
                } finally {
                    clearTimeout(timeoutId);
                }
            }),
        );

        const isAllOk = results.every((r) => r.ok);
        const components = Object.fromEntries(results.map((r) => [r.name, r.ok ? 'up' : 'down']));

        return {
            service: serviceName,
            status: isAllOk,
            components,
            version,
        };
    }
}
