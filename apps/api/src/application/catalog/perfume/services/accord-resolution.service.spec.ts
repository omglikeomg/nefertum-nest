import { Prisma } from '@prisma/client';

import { AccordResolutionService } from './accord-resolution.service';

type TxMock = {
  accord: {
    findMany: jest.Mock;
  };
};

const makeTx = (): TxMock => ({
  accord: {
    findMany: jest.fn(),
  },
});

describe('AccordResolutionService', () => {
  let service: AccordResolutionService;

  beforeEach(() => {
    service = new AccordResolutionService();
  });

  it('returns empty resolution when rawNames is empty', async () => {
    const tx = makeTx();

    const result = await service.resolve(tx as unknown as Prisma.TransactionClient, []);

    expect(result).toEqual({ resolved: [], unresolved: [] });
    expect(tx.accord.findMany).not.toHaveBeenCalled();
  });

  it('resolves an accord by case-insensitive name match', async () => {
    const tx = makeTx();
    tx.accord.findMany.mockResolvedValue([{ id: 'a1', name: 'Woody' }]);

    const result = await service.resolve(tx as unknown as Prisma.TransactionClient, ['woody']);

    expect(result.resolved).toEqual([{ rawName: 'woody', accordId: 'a1', accordName: 'Woody' }]);
    expect(result.unresolved).toEqual([]);
  });

  it('puts unmatched names into unresolved', async () => {
    const tx = makeTx();
    tx.accord.findMany.mockResolvedValue([{ id: 'a1', name: 'Woody' }]);

    const result = await service.resolve(tx as unknown as Prisma.TransactionClient, [
      'Woody',
      'Made-up',
    ]);

    expect(result.resolved).toHaveLength(1);
    expect(result.unresolved).toEqual(['Made-up']);
  });

  it('filters out whitespace-only and empty raw names', async () => {
    const tx = makeTx();
    tx.accord.findMany.mockResolvedValue([{ id: 'a1', name: 'Woody' }]);

    const result = await service.resolve(tx as unknown as Prisma.TransactionClient, [
      '  ',
      '',
      'Woody',
    ]);

    expect(result.resolved).toHaveLength(1);
    expect(tx.accord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: { in: ['Woody'], mode: 'insensitive' } },
      }),
    );
  });
});
