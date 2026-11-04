import { Get, HttpStatus, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiBaseController, Public } from '@shared/decorators';
import { BaseException } from '@shared/error';

import { HealthErrorCodes, HealthErrorMessages } from '../errors';
import { HealthService } from '../health.service';
import { GetHealthSwagger } from './health.swagger';

@Public()
@SkipThrottle()
@ApiBaseController('health', 'Health')
export class HealthController {
    constructor(private readonly service: HealthService) {}

    @Get()
    @Version(VERSION_NEUTRAL)
    @GetHealthSwagger()
    async checkHealth() {
        const health = await this.service.getHealthData();

        if (!health.status) {
            throw new BaseException(
                {
                    code: HealthErrorCodes.SERVICE_UNHEALTHY,
                    message: HealthErrorMessages[HealthErrorCodes.SERVICE_UNHEALTHY],
                    details: [
                        {
                            target: health.service,
                            status: health.status,
                            timestamp: new Date().toISOString(),
                        },
                    ],
                },
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }

        return { status: 'healthy' };
    }
}
