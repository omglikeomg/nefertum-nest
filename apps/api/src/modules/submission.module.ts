import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { CqrsModule } from '@nestjs/cqrs';

import { PrismaModule } from './prisma.module';

import { ApproveSubmissionHandler } from '../application/catalog/perfume/commands/approve-submission/approve-submission.handler';
import { AccordResolutionService } from '../application/catalog/perfume/services/accord-resolution.service';
import { BrandResolutionService } from '../application/catalog/perfume/services/brand-resolution.service';
import { NoteTaxonomyService } from '../application/catalog/perfume/services/note-taxonomy.service';
import { PerfumerResolutionService } from '../application/catalog/perfume/services/perfumer-resolution.service';
import { PerfumeMaterializationService } from '../application/catalog/perfume/services/perfume-materialization.service';

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
    CqrsModule,
  ],
  providers: [
    ApproveSubmissionHandler,
    AccordResolutionService,
    BrandResolutionService,
    NoteTaxonomyService,
    PerfumerResolutionService,
    PerfumeMaterializationService,
  ],
  controllers: [],
  exports: [PerfumeMaterializationService],
})
export class SubmissionModule {}
