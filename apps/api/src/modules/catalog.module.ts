import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { SubmitNewPerfumeHandler } from '../application/catalog/perfume/commands/submit-new-perfume/submit-new-perfume.handler';
import { ApproveSubmissionHandler } from '../application/catalog/perfume/commands/approve-submission/approve-submission.handler';
import { GetPerfumeDetailsQueryHandler } from '../application/catalog/perfume/queries/get-perfume-details/get-perfume-details.handler';

import { PerfumeResolver } from '../infrastructure/graphql/modules/perfume/perfume.resolver';
import { PerfumeSubmissionResolver } from '../infrastructure/graphql/modules/submissions/perfume-submission.resolver';
import { AdminSubmissionsController } from '../infrastructure/rest/admin/admin-submissions.controller';
import { NoteAdminController } from '../infrastructure/rest/admin/note-admin.controller';
import { PerfumeAdminController } from '../infrastructure/rest/admin/perfume-admin.controller';

import { AccordResolutionService } from '../application/catalog/perfume/services/accord-resolution.service';
import { BrandResolutionService } from '../application/catalog/perfume/services/brand-resolution.service';
import { NoteTaxonomyService } from '../application/catalog/perfume/services/note-taxonomy.service';
import { PerfumerResolutionService } from '../application/catalog/perfume/services/perfumer-resolution.service';
import { PerfumeMaterializationService } from '../application/catalog/perfume/services/perfume-materialization.service';

import { SubmissionModule } from './submission.module';

@Module({
  imports: [CqrsModule, SubmissionModule],
  providers: [
    SubmitNewPerfumeHandler,
    ApproveSubmissionHandler,
    GetPerfumeDetailsQueryHandler,
    PerfumeResolver,
    PerfumeSubmissionResolver,
    AccordResolutionService,
    BrandResolutionService,
    NoteTaxonomyService,
    PerfumerResolutionService,
    PerfumeMaterializationService,
  ],
  controllers: [AdminSubmissionsController, NoteAdminController, PerfumeAdminController],
  exports: [CqrsModule, PerfumeMaterializationService],
})
export class CatalogModule {}
