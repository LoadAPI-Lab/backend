import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

import type { SwaggerOptions } from '../interfaces';

export function setupSwagger(
    app: NestFastifyApplication,
    options: SwaggerOptions,
    servers: { readonly port: number; readonly publicUrl?: string },
) {
    const { title, description = '', version = '0.1.0', path = 'docs', extraModels = [] } = options;

    const builder = new DocumentBuilder()
        .setTitle(title)
        .setDescription(description)
        .setVersion(version)
        .addBearerAuth()
        .addServer(`http://localhost:${servers.port}`, 'Local');

    if (servers.publicUrl) {
        builder.addServer(servers.publicUrl, 'Public');
    }

    const document = SwaggerModule.createDocument(app, builder.build(), { extraModels });

    SwaggerModule.setup(path, app, cleanupOpenApiDoc(document), {
        jsonDocumentUrl: `${path}/json`,
        yamlDocumentUrl: `${path}/yaml`,
        swaggerOptions: {
            persistAuthorization: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
        },
    });
}
