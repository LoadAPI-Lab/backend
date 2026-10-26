import { ConfigModule } from '@libs/config';
import { DatabaseModule } from '@libs/database';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as schema from '@shared/entities';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
    imports: [
        ConfigModule,
        DatabaseModule.registerAsync({
            global: true,
            inject: [ConfigService],
            useFactory: (cfg: ConfigService) => ({
                schema,
                logging: cfg.get('NODE_ENV') !== 'production',
            }),
        }),
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
