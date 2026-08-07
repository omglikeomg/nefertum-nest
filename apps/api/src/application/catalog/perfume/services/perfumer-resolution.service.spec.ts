import { Prisma } from '@prisma/client';

import { PerfumerResolutionService } from './perfumer-resolution.service';

type TxMock = {
  perfumer: {
    findMany: jest.Mock;
  };
};

const makeTx = (): TxMock => ({
  perfumer: {
    findMany: jest.fn(),
  },
});

describe('PerfumerResolutionService', () => {
  let service: PerfumerResolutionService;

  beforeEach(() => {
    service = new PerfumerResolutionService();
  });

  it('returns empty resolution when rawNames is empty', async () => {
    const tx = makeTx();

    const result = await service.resolve(tx as unknown as Prisma.TransactionClient, []);

    expect(result).toEqual({ resolved: [], unresolved: [] });
    expect(tx.perfumer.findMany).not.toHaveBeenCalled();
  });

  it('resolves a perfumer by case-insensitive name match', async () => {
    const tx = makeTx();
    tx.perfumer.findMany.mockResolvedValue([{ id: 'p1', name: 'Francis Kurkdjian' }]);

    const result = await service.resolve(tx as unknown as Prisma.TransactionClient, [
      'francis kurkdjian',
    ]);

    expect(result.resolved).toEqual([
      {
        rawName: 'francis kurkdjian',
        perfumerId: 'p1',
        perfumerName: 'Francis Kurkdjian',
      },
    ]);
    expect(result.unresolved).toEqual([]);
  });

  it('puts unmatched names into unresolved', async () => {
    const tx = makeTx();
    tx.perfumer.findMany.mockResolvedValue([{ id: 'p1', name: 'Francis Kurkdjian' }]);

    const result = await service.resolve(tx as unknown as Prisma.TransactionClient, [
      'Francis Kurkdjian',
      'Unknown Person',
    ]);

    expect(result.resolved).toHaveLength(1);
    expect(result.unresolved).toEqual(['Unknown Person']);
  });

  it('filters out whitespace-only and empty raw names', async () => {
    const tx = makeTx();
    tx.perfumer.findMany.mockResolvedValue([{ id: 'p1', name: 'Francis Kurkdjian' }]);

    const result = await service.resolve(tx as unknown as Prisma.TransactionClient, [
      '  ',
      '',
      'Francis Kurkdjian',
    ]);

    expect(result.resolved).toHaveLength(1);
    expect(tx.perfumer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: { in: ['Francis Kurkdjian'], mode: 'insensitive' } },
      }),
    );
  });
});
