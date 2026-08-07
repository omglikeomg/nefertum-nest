import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { SubmitNewPerfumeHandler } from '../application/catalog/perfume/commands/submit-new-perfume/submit-new-perfume.handler';
import { GetPerfumeDetailsQueryHandler } from '../application/catalog/perfume/queries/get-perfume-details/get-perfume-details.handler';

import { PerfumeResolver } from '../infrastructure/graphql/modules/perfume/perfume.resolver';
import { SubmissionAdminController } from '../infrastructure/rest/admin/submission-admin.controller';
import { NoteAdminController } from '../infrastructure/rest/admin/note-admin.controller';
import { PerfumeAdminController } from '../infrastructure/rest/admin/perfume-admin.controller';

import { AccordResolutionService } from '../application/catalog/perfume/services/accord-resolution.service';
import { BrandResolutionService } from '../application/catalog/perfume/services/brand-resolution.service';
import { NoteTaxonomyService } from '../application/catalog/perfume/services/note-taxonomy.service';
import { PerfumerResolutionService } from '../application/catalog/perfume/services/perfumer-resolution.service';

import { SubmissionModule } from './submission.module';

@Module({
  imports: [CqrsModule, SubmissionModule],
  providers: [
    SubmitNewPerfumeHandler,
    GetPerfumeDetailsQueryHandler,
    PerfumeResolver,
    AccordResolutionService,
    BrandResolutionService,
    NoteTaxonomyService,
    PerfumerResolutionService,
  ],
  controllers: [SubmissionAdminController, NoteAdminController, PerfumeAdminController],
  exports: [CqrsModule],
})
export class CatalogModule {}
