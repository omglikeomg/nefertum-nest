import { Prisma } from '@prisma/client';

import {
  PerfumeMaterializationService,
  type MaterializationInput,
} from './perfume-materialization.service';
import type { ResolvedPayload } from '../commands/approve-submission/approve-submission.types';

type TxMock = {
  perfumeSubmission: {
    updateMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  perfume: {
    create: jest.Mock;
  };
  perfumeNote: {
    create: jest.Mock;
  };
  perfumeAccord: {
    create: jest.Mock;
  };
  perfumePerfumer: {
    create: jest.Mock;
  };
  perfumeScaleHistogram: {
    create: jest.Mock;
  };
};

const makeTx = (): TxMock => ({
  perfumeSubmission: {
    updateMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  perfume: {
    create: jest.fn(),
  },
  perfumeNote: {
    create: jest.fn(),
  },
  perfumeAccord: {
    create: jest.fn(),
  },
  perfumePerfumer: {
    create: jest.fn(),
  },
  perfumeScaleHistogram: {
    create: jest.fn(),
  },
});

const basePayload: ResolvedPayload = {
  brandId: 'brand-1',
  collectionId: null,
  name: 'Test Perfume',
  description: null,
  imageUrl: null,
  storeUrl: null,
  releaseYear: 2024,
  perfumers: [],
  notes: [],
  accords: [],
};

describe('PerfumeMaterializationService', () => {
  let service: PerfumeMaterializationService;

  beforeEach(() => {
    service = new PerfumeMaterializationService();
  });

  it('throws when no brandId is resolvable from payload or overrides', async () => {
    const tx = makeTx();

    await expect(
      service.materialize(
        {
          submissionId: 'sub-1',
          resolvedPayload: { ...basePayload, brandId: null },
        },
        tx as unknown as Prisma.TransactionClient,
      ),
    ).rejects.toThrow(/brandId/);
  });

  it('returns alreadyApproved when updateMany finds 0 rows and submission has materializedPerfumeId', async () => {
    const tx = makeTx();
    tx.perfumeSubmission.updateMany.mockResolvedValue({ count: 0 });
    tx.perfumeSubmission.findUnique.mockResolvedValue({
      materializedPerfumeId: 'existing-perfume',
    });

    const result = await service.materialize(
      {
        submissionId: 'sub-1',
        resolvedPayload: basePayload,
      },
      tx as unknown as Prisma.TransactionClient,
    );

    expect(result).toEqual({
      perfumeId: 'existing-perfume',
      alreadyApproved: true,
    });
  });

  it('materializes a perfume with default catalog-full layers when none provided', async () => {
    const tx = makeTx();
    tx.perfumeSubmission.updateMany.mockResolvedValue({ count: 1 });
    tx.perfume.create.mockResolvedValue({ id: 'p1' });

    const input: MaterializationInput = {
      submissionId: 'sub-1',
      resolvedPayload: basePayload,
    };

    const result = await service.materialize(input, tx as unknown as Prisma.TransactionClient);

    expect(result.alreadyApproved).toBe(false);
    expect(result.perfumeId).toBe('p1');
    expect(tx.perfume.create).toHaveBeenCalled();
    expect(tx.perfumeScaleHistogram.create).toHaveBeenCalledTimes(3);
  });

  it('honors layered materialization — catalog-min writes only perfume + notes', async () => {
    const tx = makeTx();
    tx.perfumeSubmission.updateMany.mockResolvedValue({ count: 1 });
    tx.perfume.create.mockResolvedValue({ id: 'p2' });

    const result = await service.materialize(
      {
        submissionId: 'sub-2',
        resolvedPayload: basePayload,
        layers: ['catalog-min'],
      },
      tx as unknown as Prisma.TransactionClient,
    );

    expect(result.perfumeId).toBe('p2');
    expect(tx.perfumeAccord.create).not.toHaveBeenCalled();
    expect(tx.perfumePerfumer.create).not.toHaveBeenCalled();
    expect(tx.perfumeScaleHistogram.create).not.toHaveBeenCalled();
  });

  it('catalog-mid writes accords + perfumers but not histograms', async () => {
    const tx = makeTx();
    tx.perfumeSubmission.updateMany.mockResolvedValue({ count: 1 });
    tx.perfume.create.mockResolvedValue({ id: 'p3' });

    await service.materialize(
      {
        submissionId: 'sub-3',
        resolvedPayload: basePayload,
        layers: ['catalog-min', 'catalog-mid'],
      },
      tx as unknown as Prisma.TransactionClient,
    );

    expect(tx.perfumeScaleHistogram.create).not.toHaveBeenCalled();
  });

  it('updates the submission to APPROVED with materializedPerfumeId', async () => {
    const tx = makeTx();
    tx.perfumeSubmission.updateMany.mockResolvedValue({ count: 1 });
    tx.perfume.create.mockResolvedValue({ id: 'p4' });

    await service.materialize(
      {
        submissionId: 'sub-4',
        resolvedPayload: basePayload,
        approvedBy: 'admin-1',
      },
      tx as unknown as Prisma.TransactionClient,
    );

    expect(tx.perfumeSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub-4' },
        data: expect.objectContaining({
          status: 'APPROVED',
          materializedPerfumeId: 'p4',
          reviewedById: 'admin-1',
        }),
      }),
    );
  });
});
