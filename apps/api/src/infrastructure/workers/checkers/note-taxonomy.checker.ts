import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { NoteTaxonomyService } from '../../../application/catalog/perfume/services/note-taxonomy.service';
import {
  CheckerStatus,
  MappedSubmissionNote,
  NoteTaxonomyCheckerResult,
  PerfumeSubmissionPayload,
} from '../../../application/submissions/submission.types';

@Injectable()
export class NoteTaxonomyChecker {
  constructor(private readonly noteResolver: NoteTaxonomyService) {}

  async check(
    tx: Prisma.TransactionClient,
    payload: PerfumeSubmissionPayload,
  ): Promise<NoteTaxonomyCheckerResult> {
    const resolution = await this.noteResolver.resolve(tx, payload.rawNotes ?? []);

    const mappedNotes: MappedSubmissionNote[] = resolution.resolved.map((note) => ({
      rawName: note.rawName,
      canonicalNoteId: note.canonicalNoteId,
      canonicalName: note.canonicalName,
    }));

    const unmappedRawNames = [...resolution.unresolved];
    const totalNotes = mappedNotes.length + unmappedRawNames.length;

    let status: CheckerStatus;
    if (totalNotes === 0) {
      status = CheckerStatus.WARN;
    } else if (unmappedRawNames.length === 0) {
      status = CheckerStatus.PASS;
    } else if (mappedNotes.length === 0) {
      status = CheckerStatus.FAIL;
    } else {
      status = CheckerStatus.WARN;
    }

    return {
      status,
      mappedNotes,
      unmappedRawNames,
      message:
        status === CheckerStatus.PASS
          ? 'All notes mapped to canonical entries.'
          : `${mappedNotes.length}/${totalNotes} notes mapped.`,
    };
  }
}
