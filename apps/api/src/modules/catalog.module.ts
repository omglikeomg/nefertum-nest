import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { SubmitNewPerfumeHandler } from '../application/catalog/perfume/commands/submit-new-perfume/submit-new-perfume.handler';
import { ApproveSubmissionHandler } from '../application/catalog/perfume/commands/approve-submission/approve-submission.handler';
import { GetPerfumeDetailsQueryHandler } from '../application/catalog/perfume/queries/get-perfume-details/get-perfume-details.handler';

import { PerfumeResolver } from '../infrastructure/graphql/modules/perfume/perfume.resolver';
import { SubmissionAdminController } from '../infrastructure/rest/admin/submission-admin.controller';
import { NoteAdminController } from '../infrastructure/rest/admin/note-admin.controller';
import { PerfumeAdminController } from '../infrastructure/rest/admin/perfume-admin.controller';

@Module({
  imports: [CqrsModule],
  providers: [
    SubmitNewPerfumeHandler,
    ApproveSubmissionHandler,
    GetPerfumeDetailsQueryHandler,
    PerfumeResolver,
  ],
  controllers: [SubmissionAdminController, NoteAdminController, PerfumeAdminController],
  exports: [CqrsModule],
})
export class CatalogModule {}
