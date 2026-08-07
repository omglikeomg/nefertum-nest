import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { PrismaModule } from './prisma.module';
import { CatalogModule } from './catalog.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST') ?? 'localhost',
          port: Number(config.get<string>('REDIS_PORT') ?? 6379),
        },
      }),
    }),
    PrismaModule,
    CatalogModule,
  ],
  providers: [],
  controllers: [],
  exports: [],
})
export class SubmissionModule {}
