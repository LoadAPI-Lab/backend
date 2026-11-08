import { bootstrapApp } from '@libs/bootstrap';
import { GlobalErrorResponse } from '@shared/error';
import { enableRouteBodyLimits } from '@shared/http';

import { AppModule } from './app.module';

bootstrapApp({
    appModule: AppModule,
    swagger: {
        title: 'LoadAPI',
        description: 'LoadAPI control plane',
        version: '0.1.0',
        extraModels: [GlobalErrorResponse.Output],
    },
    setupApp: enableRouteBodyLimits,
}).catch((error: unknown) => {
    console.error('Failed to start:', error);
    process.exit(1);
});
