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

import { SubmitPerfumeHandler } from '../application/submissions/commands/submit-perfume/submit-perfume.handler';
import { RejectSubmissionHandler } from '../application/submissions/commands/reject-submission/reject-submission.handler';
import { PERFUME_SUBMISSION_QUEUE } from '../application/submissions/submission.types';

import { SubmissionProcessor } from '../infrastructure/workers/submission.processor';
import { BrandResolutionChecker } from '../infrastructure/workers/checkers/brand-resolution.checker';
import { NoteTaxonomyChecker } from '../infrastructure/workers/checkers/note-taxonomy.checker';
import { UrlAndImageHealthChecker } from '../infrastructure/workers/checkers/url-and-image-health.checker';
import { DuplicateSignatureChecker } from '../infrastructure/workers/checkers/duplicate-signature.checker';
import { ConfidenceCalculator } from '../infrastructure/workers/checkers/confidence.calculator';

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
    BullModule.registerQueue({ name: PERFUME_SUBMISSION_QUEUE }),
    PrismaModule,
    CqrsModule,
  ],
  providers: [
    ApproveSubmissionHandler,
    SubmitPerfumeHandler,
    RejectSubmissionHandler,
    AccordResolutionService,
    BrandResolutionService,
    NoteTaxonomyService,
    PerfumerResolutionService,
    PerfumeMaterializationService,
    BrandResolutionChecker,
    NoteTaxonomyChecker,
    UrlAndImageHealthChecker,
    DuplicateSignatureChecker,
    ConfidenceCalculator,
    SubmissionProcessor,
  ],
  controllers: [],
  exports: [PerfumeMaterializationService],
})
export class SubmissionModule {}
