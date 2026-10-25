import fastifyCompress from '@fastify/compress';
import fastifyCookie from '@fastify/cookie';
import { Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { createId } from '@paralleldrive/cuid2';

import type { BootstrapOptions } from './interfaces';
import { setupLogger, setupSwagger, withThrottler } from './setups';

export async function bootstrapApp(options: BootstrapOptions) {
    const { appModule, apiVersion = '1', swagger, setupApp } = options;

    const adapter = new FastifyAdapter({
        requestIdHeader: 'x-request-id',
        genReqId: () => createId(),
    });

    const app = await NestFactory.create<NestFastifyApplication>(withThrottler(appModule), adapter);
    const cfg = app.get(ConfigService);
    const isProduction = cfg.get('NODE_ENV') === 'production';
    const port = cfg.get('PORT');

    app.enableShutdownHooks();
    setupLogger(app, 'core', isProduction);
    addFastifyHooks(app);

    // TODO: exclude SSE route from compression
    await app.register(fastifyCompress, { global: true, threshold: 1024 });
    await app.register(fastifyCookie, {
        secret: cfg.get('COOKIE_SECRET'),
        parseOptions: {
            httpOnly: true,
            sameSite: 'lax',
            secure: isProduction,
            signed: true,
            path: '/',
            domain: cfg.get('COOKIE_DOMAIN'),
        },
    });

    app.enableCors({ origin: cfg.get('CORS_ALLOWED_ORIGINS'), credentials: true });
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: apiVersion });

    if (swagger) {
        setupSwagger(app, swagger, { port, publicUrl: cfg.get('API_PUBLIC_URL') });
    }
    if (setupApp) {
        await setupApp(app);
    }

    await app.listen(port, '0.0.0.0');

    const logger = new Logger('Bootstrap');
    logger.log(`API: http://localhost:${port}/v${apiVersion}`);
    if (swagger) {
        logger.log(`Swagger: http://localhost:${port}/${swagger.path ?? 'docs'}`);
    }
}

function addFastifyHooks(app: NestFastifyApplication) {
    const fastify = app.getHttpAdapter().getInstance();

    fastify.addHook('onRequest', (request: any, reply: any, done) => {
        reply.setHeader = (key: string, value: string) => reply.raw.setHeader(key, value);
        reply.end = (body?: unknown) => reply.send(body ?? '');
        request.res = reply;
        done();
    });

    fastify.addHook('onSend', (request, reply, payload, done) => {
        reply.header('x-request-id', request.id);
        done(null, payload);
    });
}
