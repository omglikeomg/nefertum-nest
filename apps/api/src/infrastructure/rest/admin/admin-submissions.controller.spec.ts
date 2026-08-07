import { CommandBus } from '@nestjs/cqrs';

import { PrismaService } from '../../database/prisma/prisma.service';

import { AdminSubmissionsController } from './admin-submissions.controller';
import { AdminGuard } from './admin.guard';

type PrismaMock = {
  perfumeSubmission: {
    count: jest.Mock;
    findMany: jest.Mock;
  };
};

const makePrisma = (): PrismaMock => ({
  perfumeSubmission: {
    count: jest.fn().mockResolvedValue(0),
    findMany: jest.fn().mockResolvedValue([]),
  },
});

describe('AdminGuard', () => {
  it('returns true (stub)', () => {
    const guard = new AdminGuard();
    expect(guard.canActivate({} as never)).toBe(true);
  });
});

describe('AdminSubmissionsController', () => {
  let controller: AdminSubmissionsController;
  let prisma: PrismaMock;
  let commandBus: { execute: jest.Mock };

  beforeEach(() => {
    prisma = makePrisma();
    commandBus = { execute: jest.fn() };
    controller = new AdminSubmissionsController(
      commandBus as unknown as CommandBus,
      prisma as unknown as PrismaService,
    );
  });

  it('list() returns paginated submissions', async () => {
    prisma.perfumeSubmission.count.mockResolvedValue(42);
    prisma.perfumeSubmission.findMany.mockResolvedValue([
      {
        id: 'sub-1',
        status: 'NEEDS_REVIEW',
        confidence: 75,
        payload: { name: 'X', brandName: 'Acme', brandId: null },
        unresolvedEntities: null,
        checkReport: null,
      },
    ]);

    const result = await controller.list({
      status: 'NEEDS_REVIEW',
      page: 2,
      pageSize: 20,
    });

    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(20);
    expect(result.total).toBe(42);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'sub-1',
      status: 'NEEDS_REVIEW',
      confidence: 75,
    });
    expect(prisma.perfumeSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'NEEDS_REVIEW' },
        skip: 20,
        take: 20,
      }),
    );
  });

  it('approve() forwards overrides to ApproveSubmissionCommand', async () => {
    commandBus.execute.mockResolvedValue({
      perfumeId: 'p1',
      alreadyApproved: false,
    });

    const result = await controller.approve('sub-1', {
      brandId: '00000000-0000-0000-0000-000000000001',
    });

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        submissionId: 'sub-1',
        input: expect.objectContaining({
          submissionId: 'sub-1',
          overrides: expect.objectContaining({ brandId: '00000000-0000-0000-0000-000000000001' }),
        }),
      }),
    );
    expect(result).toEqual({ perfumeId: 'p1', alreadyApproved: false });
  });

  it('reject() forwards reason to RejectSubmissionCommand', async () => {
    commandBus.execute.mockResolvedValue({
      submissionId: 'sub-2',
      status: 'REJECTED',
    });

    const result = await controller.reject('sub-2', { reason: 'spam content' });

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          submissionId: 'sub-2',
          reason: 'spam content',
        }),
      }),
    );
    expect(result).toEqual({ submissionId: 'sub-2', status: 'REJECTED' });
  });
});
