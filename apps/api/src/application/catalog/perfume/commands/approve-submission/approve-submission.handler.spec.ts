import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { PrismaService } from '../../../../../infrastructure/database/prisma/prisma.service';

import { ApproveSubmissionHandler } from './approve-submission.handler';
import { ApproveSubmissionCommand } from './approve-submission.command';
import { PerfumeMaterializationService } from '../../services/perfume-materialization.service';

type SubmissionRow = {
  id: string;
  status: 'QUEUED' | 'PROCESSING' | 'NEEDS_REVIEW' | 'APPROVED' | 'REJECTED';
  payload: unknown;
  materializedPerfumeId: string | null;
};

type PrismaMock = {
  perfumeSubmission: {
    findUnique: jest.Mock<Promise<SubmissionRow | null>, [{ where: { id: string } }]>;
  };
  $transaction: jest.Mock;
};

const makePrisma = (): PrismaMock => ({
  perfumeSubmission: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
});

const makeMaterialization = () =>
  ({
    materialize: jest.fn(),
  }) as unknown as PerfumeMaterializationService & {
    materialize: jest.Mock;
  };

describe('ApproveSubmissionHandler', () => {
  let handler: ApproveSubmissionHandler;
  let prisma: PrismaMock;
  let materialization: ReturnType<typeof makeMaterialization>;
  let commandBus: CommandBus;

  beforeEach(() => {
    prisma = makePrisma();
    materialization = makeMaterialization();
    commandBus = { execute: jest.fn() } as unknown as CommandBus;
    handler = new ApproveSubmissionHandler(
      prisma as unknown as PrismaService,
      materialization as unknown as PerfumeMaterializationService,
    );
    void commandBus;
  });

  it('throws NotFoundException when the submission does not exist', async () => {
    prisma.perfumeSubmission.findUnique.mockResolvedValue(null);

    await expect(
      handler.execute(new ApproveSubmissionCommand('sub-missing')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException when the submission is REJECTED', async () => {
    prisma.perfumeSubmission.findUnique.mockResolvedValue({
      id: 'sub-1',
      status: 'REJECTED',
      payload: {},
      materializedPerfumeId: null,
    });

    await expect(handler.execute(new ApproveSubmissionCommand('sub-1'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws ConflictException when APPROVED but no materializedPerfumeId', async () => {
    prisma.perfumeSubmission.findUnique.mockResolvedValue({
      id: 'sub-1',
      status: 'APPROVED',
      payload: {},
      materializedPerfumeId: null,
    });

    await expect(handler.execute(new ApproveSubmissionCommand('sub-1'))).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('accepts the tuple shape and forwards layers to materialization', async () => {
    prisma.perfumeSubmission.findUnique.mockResolvedValue({
      id: 'sub-1',
      status: 'NEEDS_REVIEW',
      payload: { brandId: 'brand-1', name: 'X', notes: [], perfumers: [], accords: [] },
      materializedPerfumeId: null,
    });
    prisma.$transaction.mockImplementation(async (work) => work({} as never));
    materialization.materialize.mockResolvedValue({
      perfumeId: 'p1',
      alreadyApproved: false,
    });

    await handler.execute(new ApproveSubmissionCommand('sub-1', ['catalog-min']));

    expect(materialization.materialize).toHaveBeenCalledWith(
      expect.objectContaining({
        submissionId: 'sub-1',
        layers: ['catalog-min'],
      }),
      expect.anything(),
    );
  });

  it('accepts the object shape with overrides', async () => {
    prisma.perfumeSubmission.findUnique.mockResolvedValue({
      id: 'sub-2',
      status: 'NEEDS_REVIEW',
      payload: { brandId: 'brand-1', name: 'X', notes: [], perfumers: [], accords: [] },
      materializedPerfumeId: null,
    });
    prisma.$transaction.mockImplementation(async (work) => work({} as never));
    materialization.materialize.mockResolvedValue({
      perfumeId: 'p2',
      alreadyApproved: false,
    });

    await handler.execute(
      new ApproveSubmissionCommand({
        submissionId: 'sub-2',
        input: {
          submissionId: 'sub-2',
          approvedBy: 'admin-1',
          autoApproved: false,
          overrides: { name: 'Override Name' },
        },
      }),
    );

    expect(materialization.materialize).toHaveBeenCalledWith(
      expect.objectContaining({
        submissionId: 'sub-2',
        approvedBy: 'admin-1',
        overrides: { name: 'Override Name' },
        layers: undefined,
      }),
      expect.anything(),
    );
  });

  it('returns the materialization result unchanged', async () => {
    prisma.perfumeSubmission.findUnique.mockResolvedValue({
      id: 'sub-3',
      status: 'NEEDS_REVIEW',
      payload: { brandId: 'brand-1', name: 'X', notes: [], perfumers: [], accords: [] },
      materializedPerfumeId: null,
    });
    prisma.$transaction.mockImplementation(async (work) => work({} as never));
    materialization.materialize.mockResolvedValue({
      perfumeId: 'p3',
      alreadyApproved: true,
    });

    const result = await handler.execute(new ApproveSubmissionCommand('sub-3'));

    expect(result.perfumeId).toBe('p3');
    expect(result.alreadyApproved).toBe(true);
    expect(result.submissionId).toBe('sub-3');
  });
});
