import { Prisma } from '@prisma/client';

import { NoteTaxonomyService } from '../../../application/catalog/perfume/services/note-taxonomy.service';
import {
  CheckerStatus,
  PerfumeSubmissionPayload,
} from '../../../application/submissions/submission.types';
import { NoteTaxonomyChecker } from './note-taxonomy.checker';

describe('NoteTaxonomyChecker', () => {
  it('maps all-resolved to PASS', async () => {
    const noteResolver = {
      resolve: jest.fn().mockResolvedValue({
        resolved: [{ rawName: 'Rose', canonicalNoteId: 'n1', canonicalName: 'Rose' }],
        unresolved: [],
      }),
    } as unknown as NoteTaxonomyService;
    const checker = new NoteTaxonomyChecker(noteResolver);

    const result = await checker.check(
      {} as Prisma.TransactionClient,
      { name: 'X', rawNotes: ['Rose'] } as PerfumeSubmissionPayload,
    );

    expect(result.status).toBe(CheckerStatus.PASS);
    expect(result.mappedNotes).toHaveLength(1);
    expect(result.unmappedRawNames).toEqual([]);
  });

  it('maps partial resolution to WARN', async () => {
    const noteResolver = {
      resolve: jest.fn().mockResolvedValue({
        resolved: [{ rawName: 'Rose', canonicalNoteId: 'n1', canonicalName: 'Rose' }],
        unresolved: ['Bergamot'],
      }),
    } as unknown as NoteTaxonomyService;
    const checker = new NoteTaxonomyChecker(noteResolver);

    const result = await checker.check(
      {} as Prisma.TransactionClient,
      { name: 'X', rawNotes: ['Rose', 'Bergamot'] } as PerfumeSubmissionPayload,
    );

    expect(result.status).toBe(CheckerStatus.WARN);
    expect(result.mappedNotes).toHaveLength(1);
    expect(result.unmappedRawNames).toEqual(['Bergamot']);
  });

  it('maps no-resolution to FAIL', async () => {
    const noteResolver = {
      resolve: jest.fn().mockResolvedValue({
        resolved: [],
        unresolved: ['Bergamot'],
      }),
    } as unknown as NoteTaxonomyService;
    const checker = new NoteTaxonomyChecker(noteResolver);

    const result = await checker.check(
      {} as Prisma.TransactionClient,
      { name: 'X', rawNotes: ['Bergamot'] } as PerfumeSubmissionPayload,
    );

    expect(result.status).toBe(CheckerStatus.FAIL);
  });

  it('maps empty rawNotes to WARN', async () => {
    const noteResolver = {
      resolve: jest.fn().mockResolvedValue({ resolved: [], unresolved: [] }),
    } as unknown as NoteTaxonomyService;
    const checker = new NoteTaxonomyChecker(noteResolver);

    const result = await checker.check(
      {} as Prisma.TransactionClient,
      { name: 'X' } as PerfumeSubmissionPayload,
    );

    expect(result.status).toBe(CheckerStatus.WARN);
  });
});
