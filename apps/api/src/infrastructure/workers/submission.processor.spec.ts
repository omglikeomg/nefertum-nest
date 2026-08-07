import { CommandBus } from '@nestjs/cqrs';
import { Job } from 'bullmq';

import { PrismaService } from '../database/prisma/prisma.service';
import { ApproveSubmissionCommand } from '../../application/catalog/perfume/commands/approve-submission/approve-submission.command';
import { BrandResolutionChecker } from './checkers/brand-resolution.checker';
import { NoteTaxonomyChecker } from './checkers/note-taxonomy.checker';
import { UrlAndImageHealthChecker } from './checkers/url-and-image-health.checker';
import { DuplicateSignatureChecker } from './checkers/duplicate-signature.checker';
import { ConfidenceCalculator } from './checkers/confidence.calculator';
import { PERFUME_SUBMISSION_JOB_NAME, SubmissionProcessor } from './submission.processor';
import {
  PerfumeSubmissionJobData,
  CheckerStatus,
} from '../../application/submissions/submission.types';

type SubmissionRow = {
  id: string;
  status: 'QUEUED' | 'PROCESSING' | 'NEEDS_REVIEW' | 'APPROVED' | 'REJECTED';
  payload: unknown;
};

type PrismaMock = {
  perfumeSubmission: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  $transaction: jest.Mock;
};

const makePrisma = (): PrismaMock => ({
  perfumeSubmission: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
});

const buildJob = (id = 'sub-1'): Job<PerfumeSubmissionJobData> =>
  ({
    data: { submissionId: id },
  }) as unknown as Job<PerfumeSubmissionJobData>;

describe('SubmissionProcessor', () => {
  let processor: SubmissionProcessor;
  let prisma: PrismaMock;
  let commandBus: { execute: jest.Mock };

  beforeEach(() => {
    prisma = makePrisma();
    prisma.$transaction.mockImplementation(async (work) =>
      work({
        perfumeSubmission: {
          findUnique: prisma.perfumeSubmission.findUnique,
          update: prisma.perfumeSubmission.update,
        },
      } as never),
    );
    commandBus = { execute: jest.fn() };

    processor = new SubmissionProcessor(
      prisma as unknown as PrismaService,
      commandBus as unknown as CommandBus,
      { check: jest.fn() } as unknown as BrandResolutionChecker,
      { check: jest.fn() } as unknown as NoteTaxonomyChecker,
      { check: jest.fn() } as unknown as UrlAndImageHealthChecker,
      { check: jest.fn() } as unknown as DuplicateSignatureChecker,
      new ConfidenceCalculator(),
    );
    void PERFUME_SUBMISSION_JOB_NAME;
  });

  it('returns needs_review when submission is missing', async () => {
    prisma.perfumeSubmission.findUnique.mockResolvedValue(null);

    const result = await processor.process(buildJob());

    expect(result.status).toBe('needs_review');
    expect(commandBus.execute).not.toHaveBeenCalled();
  });

  it('returns needs_review when payload fails validation', async () => {
    prisma.perfumeSubmission.findUnique.mockResolvedValue({
      id: 'sub-1',
      status: 'QUEUED',
      payload: {},
    } as SubmissionRow);

    const result = await processor.process(buildJob());

    expect(result.status).toBe('needs_review');
    expect(prisma.perfumeSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'NEEDS_REVIEW' }),
      }),
    );
  });

  it('returns approved when confidence.autoApprovable and materialization succeeds', async () => {
    prisma.perfumeSubmission.findUnique.mockResolvedValueOnce({
      id: 'sub-1',
      status: 'QUEUED',
      payload: {
        name: 'Acme Eau de Parfum',
        description: 'A lovely scent',
        imageUrl: 'https://example.com/x.jpg',
        storeUrl: 'https://example.com/x',
        brandName: 'Acme',
      },
    } as SubmissionRow);

    (
      processor as unknown as {
        brandChecker: { check: jest.Mock };
        noteChecker: { check: jest.Mock };
        urlAndImageChecker: { check: jest.Mock };
        duplicateChecker: { check: jest.Mock };
      }
    ).brandChecker.check.mockResolvedValue({
      status: CheckerStatus.PASS,
      code: 'RESOLVED',
      resolvedBrandId: 'brand-1',
    });
    (
      processor as unknown as { noteChecker: { check: jest.Mock } }
    ).noteChecker.check.mockResolvedValue({
      status: CheckerStatus.PASS,
      mappedNotes: [{ rawName: 'Rose', canonicalNoteId: 'n1', canonicalName: 'Rose' }],
      unmappedRawNames: [],
    });
    (
      processor as unknown as { urlAndImageChecker: { check: jest.Mock } }
    ).urlAndImageChecker.check.mockResolvedValue({
      status: CheckerStatus.PASS,
      storeUrlOk: true,
      imageUrlOk: true,
      errors: [],
    });
    (
      processor as unknown as { duplicateChecker: { check: jest.Mock } }
    ).duplicateChecker.check.mockResolvedValue({
      status: CheckerStatus.PASS,
      signature: 'acme::acme eau de parfum',
      exactDuplicate: false,
      maxSimilarity: 0,
      similarPerfumes: [],
    });

    commandBus.execute.mockResolvedValue({ perfumeId: 'p1' });

    const result = await processor.process(buildJob());

    expect(result.status).toBe('approved');
    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(ApproveSubmissionCommand));
  });

  it('falls back to needs_review when materialization throws', async () => {
    prisma.perfumeSubmission.findUnique.mockResolvedValueOnce({
      id: 'sub-1',
      status: 'QUEUED',
      payload: {
        name: 'Acme Eau de Parfum',
        description: 'A lovely scent',
        imageUrl: 'https://example.com/x.jpg',
        storeUrl: 'https://example.com/x',
        brandName: 'Acme',
      },
    } as SubmissionRow);

    (
      processor as unknown as {
        brandChecker: { check: jest.Mock };
        noteChecker: { check: jest.Mock };
        urlAndImageChecker: { check: jest.Mock };
        duplicateChecker: { check: jest.Mock };
      }
    ).brandChecker.check.mockResolvedValue({
      status: CheckerStatus.PASS,
      code: 'RESOLVED',
      resolvedBrandId: 'brand-1',
    });
    (
      processor as unknown as { noteChecker: { check: jest.Mock } }
    ).noteChecker.check.mockResolvedValue({
      status: CheckerStatus.PASS,
      mappedNotes: [{ rawName: 'Rose', canonicalNoteId: 'n1', canonicalName: 'Rose' }],
      unmappedRawNames: [],
    });
    (
      processor as unknown as { urlAndImageChecker: { check: jest.Mock } }
    ).urlAndImageChecker.check.mockResolvedValue({
      status: CheckerStatus.PASS,
      storeUrlOk: true,
      imageUrlOk: true,
      errors: [],
    });
    (
      processor as unknown as { duplicateChecker: { check: jest.Mock } }
    ).duplicateChecker.check.mockResolvedValue({
      status: CheckerStatus.PASS,
      signature: 'acme::acme eau de parfum',
      exactDuplicate: false,
      maxSimilarity: 0,
      similarPerfumes: [],
    });

    commandBus.execute.mockRejectedValue(new Error('materialization failed'));

    const result = await processor.process(buildJob());

    expect(result.status).toBe('needs_review');
    expect(prisma.perfumeSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'NEEDS_REVIEW',
          rejectionReason: expect.stringContaining('materialization'),
        }),
      }),
    );
  });
});
