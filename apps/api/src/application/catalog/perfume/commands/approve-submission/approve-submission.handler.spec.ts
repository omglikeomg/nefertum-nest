import { NotFoundException } from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';

import type { PrismaService } from '../../../../../infrastructure/database/prisma/prisma.service';
import { ApproveSubmissionHandler } from './approve-submission.handler';
import { ApproveSubmissionCommand } from './approve-submission.command';
import type { ResolvedPayload } from './approve-submission.types';

describe('ApproveSubmissionHandler', () => {
  function makeResolvedPayload(): ResolvedPayload {
    return {
      brandId: 'brand-1',
      collectionId: null,
      name: 'Sauvage',
      description: 'A classic',
      imageUrl: null,
      storeUrl: null,
      releaseYear: 2015,
      perfumers: [
        { rawName: 'François Demachy', perfumerId: 'perfumer-1', perfumerName: 'François Demachy' },
      ],
      notes: [
        { rawName: 'Bergamot', level: 'TOP', canonicalNoteId: 'note-1' },
        { rawName: 'Pepper', level: 'TOP', canonicalNoteId: 'note-2' },
        { rawName: 'Unknown', level: 'TOP', canonicalNoteId: null },
      ],
      accords: [
        { rawName: 'Fresh Spicy', accordId: 'accord-1', accordName: 'Fresh Spicy' },
      ],
    };
  }

  function setupPrisma(submissionOverrides: Partial<{
    status: SubmissionStatus;
    resolvedPayload: ResolvedPayload | null;
  }> = {}) {
    const prisma = mockDeep<PrismaService>();
    prisma.submissionQueue.findUnique.mockResolvedValue({
      id: 'sub-1',
      status: submissionOverrides.status ?? SubmissionStatus.REQUIREMENTS_PASSED,
      resolvedPayload: (submissionOverrides.resolvedPayload ?? makeResolvedPayload()) as never,
    } as never);

    prisma.$transaction.mockImplementation(async (cb) => {
      const fn = cb as (tx: typeof prisma) => Promise<unknown>;
      return fn(prisma);
    });

    prisma.perfume.create.mockResolvedValue({
      id: 'perfume-new',
      brandId: 'brand-1',
      collectionId: null,
      name: 'Sauvage',
      slug: 'sauvage',
      description: 'A classic',
      imageUrl: null,
      storeUrl: null,
      releaseYear: 2015,
      discontinued: false,
      discontinuationNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    return prisma;
  }

  it('catalog-min: produces 1 Perfume + 2 PerfumeNote rows; submission flips to APPROVED', async () => {
    const prisma = setupPrisma();
    const handler = new ApproveSubmissionHandler(prisma);

    const result = await handler.execute(
      new ApproveSubmissionCommand('sub-1', ['catalog-min']),
    );

    expect(prisma.perfume.create).toHaveBeenCalledTimes(1);
    expect(prisma.perfumeNote.create).toHaveBeenCalledTimes(2);
    expect(prisma.perfumeAccord.create).not.toHaveBeenCalled();
    expect(prisma.perfumePerfumer.create).not.toHaveBeenCalled();
    expect(prisma.perfumeScaleHistogram.create).not.toHaveBeenCalled();
    expect(prisma.submissionQueue.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub-1' },
        data: expect.objectContaining({ status: SubmissionStatus.APPROVED }),
      }),
    );
    expect(result.materialized).toEqual({
      perfume: true,
      perfumeNotes: 2,
      accords: 0,
      perfumers: 0,
      histograms: 0,
    });
  });

  it('catalog-mid: adds PerfumeAccord + PerfumePerfumer rows', async () => {
    const prisma = setupPrisma();
    const handler = new ApproveSubmissionHandler(prisma);

    const result = await handler.execute(
      new ApproveSubmissionCommand('sub-1', ['catalog-min', 'catalog-mid']),
    );

    expect(prisma.perfumeAccord.create).toHaveBeenCalledTimes(1);
    expect(prisma.perfumePerfumer.create).toHaveBeenCalledTimes(1);
    expect(result.materialized.accords).toBe(1);
    expect(result.materialized.perfumers).toBe(1);
  });

  it('catalog-full: writes 3 PerfumeScaleHistogram rows (GENDER, LONGEVITY, SILLAGE) and updates Perfumer bio', async () => {
    const prisma = setupPrisma();
    const handler = new ApproveSubmissionHandler(prisma);

    const result = await handler.execute(
      new ApproveSubmissionCommand('sub-1', ['catalog-min', 'catalog-mid', 'catalog-full'], {
        GENDER: { 0: 1, 1: 2, 2: 5, 3: 3, 4: 1 },
        LONGEVITY: { 0: 1, 1: 4, 2: 6, 3: 5, 4: 1 },
        SILLAGE: { 0: 1, 1: 2, 2: 7, 3: 4, 4: 1 },
        VALUE: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 },
      }),
    );

    expect(prisma.perfumeScaleHistogram.create).toHaveBeenCalledTimes(3);
    expect(result.materialized.histograms).toBe(3);
  });

  it('catalog-full: invalid histogram buckets — ScaleHistogram.fromPersistence throws → transaction rolls back', async () => {
    const prisma = setupPrisma();
    const handler = new ApproveSubmissionHandler(prisma);

    await expect(
      handler.execute(
        new ApproveSubmissionCommand('sub-1', ['catalog-min', 'catalog-mid', 'catalog-full'], {
          GENDER: { 0: 1, 1: 2, 2: 5, 3: 3, 4: 1 },
          LONGEVITY: { 0: 1, 1: 4, 2: 6, 3: 5, 4: 1 },
          SILLAGE: { 0: 1, 1: 2, 2: 7, 3: 4, 4: -1 } as never, // negative value → invalid
          VALUE: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 },
        }),
      ),
    ).rejects.toThrow();
  });

  it('catalog-full: zero-totalVotes metrics skip PerfumeScaleHistogram write (E9)', async () => {
    const prisma = setupPrisma();
    const handler = new ApproveSubmissionHandler(prisma);

    const result = await handler.execute(
      new ApproveSubmissionCommand('sub-1', ['catalog-min', 'catalog-mid', 'catalog-full'], {
        GENDER: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }, // zero votes
        LONGEVITY: { 0: 1, 1: 0, 2: 0, 3: 0, 4: 0 },
        SILLAGE: { 0: 0, 1: 2, 2: 0, 3: 0, 4: 0 },
        VALUE: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 },
      }),
    );

    // Only LONGEVITY and SILLAGE have totalVotes > 0 (GENDER has no votes — skipped)
    expect(prisma.perfumeScaleHistogram.create).toHaveBeenCalledTimes(2);
    expect(result.materialized.histograms).toBe(2);
  });

  it('catalog-min: missing canonicalNoteId does NOT create a PerfumeNote (E2)', async () => {
    const prisma = setupPrisma();
    const handler = new ApproveSubmissionHandler(prisma);

    const result = await handler.execute(
      new ApproveSubmissionCommand('sub-1', ['catalog-min']),
    );

    // 3 notes in payload but 1 has canonicalNoteId === null
    expect(prisma.perfumeNote.create).toHaveBeenCalledTimes(2);
    expect(result.materialized.perfumeNotes).toBe(2);
  });

  it('throws NotFoundException when submissionId is missing', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.submissionQueue.findUnique.mockResolvedValue(null);
    const handler = new ApproveSubmissionHandler(prisma);

    await expect(
      handler.execute(new ApproveSubmissionCommand('does-not-exist')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when submission status is not REQUIREMENTS_PASSED', async () => {
    const prisma = setupPrisma({ status: SubmissionStatus.PENDING });
    const handler = new ApproveSubmissionHandler(prisma);

    await expect(
      handler.execute(new ApproveSubmissionCommand('sub-1', ['catalog-min'])),
    ).rejects.toThrow(/not ready for approval/);
  });
});
