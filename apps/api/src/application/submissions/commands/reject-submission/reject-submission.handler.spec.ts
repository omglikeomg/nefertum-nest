import { BadRequestException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

import { RejectSubmissionCommand } from './reject-submission.command';
import { RejectSubmissionHandler } from './reject-submission.handler';

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

describe('RejectSubmissionHandler', () => {
  let handler: RejectSubmissionHandler;
  let prisma: PrismaMock;

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
    handler = new RejectSubmissionHandler(prisma as unknown as PrismaService);
  });

  it('throws NotFoundException when submission does not exist', async () => {
    prisma.perfumeSubmission.findUnique.mockResolvedValue(null);

    await expect(
      handler.execute(
        new RejectSubmissionCommand({
          submissionId: 'sub-missing',
          reason: 'spam',
        }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException when submission is already APPROVED', async () => {
    prisma.perfumeSubmission.findUnique.mockResolvedValue({
      id: 'sub-1',
      status: 'APPROVED',
    });

    await expect(
      handler.execute(new RejectSubmissionCommand({ submissionId: 'sub-1', reason: 'spam' })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates the submission to REJECTED with the reason', async () => {
    prisma.perfumeSubmission.findUnique.mockResolvedValue({
      id: 'sub-2',
      status: 'NEEDS_REVIEW',
    });
    prisma.perfumeSubmission.update.mockResolvedValue({});

    const result = await handler.execute(
      new RejectSubmissionCommand({
        submissionId: 'sub-2',
        reason: 'inappropriate content',
        rejectedBy: 'admin-1',
      }),
    );

    expect(prisma.perfumeSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub-2' },
        data: expect.objectContaining({
          status: 'REJECTED',
          rejectionReason: 'inappropriate content',
          reviewedById: 'admin-1',
        }),
      }),
    );
    expect(result).toEqual({ submissionId: 'sub-2', status: 'REJECTED' });
  });
});
