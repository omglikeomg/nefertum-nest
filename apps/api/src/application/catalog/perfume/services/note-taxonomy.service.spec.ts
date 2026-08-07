import { Prisma } from '@prisma/client';

import { NoteTaxonomyService } from './note-taxonomy.service';

type TxMock = {
  note: {
    findMany: jest.Mock;
  };
};

const makeTx = (): TxMock => ({
  note: {
    findMany: jest.fn(),
  },
});

describe('NoteTaxonomyService', () => {
  let service: NoteTaxonomyService;

  beforeEach(() => {
    service = new NoteTaxonomyService();
  });

  it('returns empty resolution when rawNames is empty', async () => {
    const tx = makeTx();

    const result = await service.resolve(tx as unknown as Prisma.TransactionClient, []);

    expect(result).toEqual({ resolved: [], unresolved: [] });
    expect(tx.note.findMany).not.toHaveBeenCalled();
  });

  it('filters out empty and whitespace-only names', async () => {
    const tx = makeTx();
    tx.note.findMany.mockResolvedValue([]);

    const result = await service.resolve(tx as unknown as Prisma.TransactionClient, [
      '  ',
      '',
      '\t',
      'Rose',
    ]);

    expect(result.unresolved).toEqual(['Rose']);
    expect(tx.note.findMany).toHaveBeenCalledTimes(1);
    expect(tx.note.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              canonicalName: expect.objectContaining({
                in: ['Rose'],
              }),
            }),
          ]),
        }),
      }),
    );
  });

  it('resolves a canonical name match', async () => {
    const tx = makeTx();
    tx.note.findMany.mockResolvedValue([
      {
        id: 'n1',
        canonicalName: 'Rose',
        description: null,
        aliases: [],
      },
    ]);

    const result = await service.resolve(tx as unknown as Prisma.TransactionClient, ['Rose']);

    expect(result.resolved).toEqual([
      { rawName: 'Rose', canonicalNoteId: 'n1', canonicalName: 'Rose' },
    ]);
    expect(result.unresolved).toEqual([]);
  });

  it('resolves via alias match', async () => {
    const tx = makeTx();
    tx.note.findMany.mockResolvedValue([
      {
        id: 'n1',
        canonicalName: 'Rose',
        description: null,
        aliases: [{ alias: 'rosy' }],
      },
    ]);

    const result = await service.resolve(tx as unknown as Prisma.TransactionClient, ['rosy']);

    expect(result.resolved).toEqual([
      { rawName: 'rosy', canonicalNoteId: 'n1', canonicalName: 'Rose' },
    ]);
    expect(result.unresolved).toEqual([]);
  });

  it('puts unmatched names into unresolved', async () => {
    const tx = makeTx();
    tx.note.findMany.mockResolvedValue([]);

    const result = await service.resolve(tx as unknown as Prisma.TransactionClient, [
      'Rose',
      'Bergamot',
    ]);

    expect(result.resolved).toEqual([]);
    expect(result.unresolved).toEqual(['Rose', 'Bergamot']);
  });

  it('deduplicates raw names after trim', async () => {
    const tx = makeTx();
    tx.note.findMany.mockResolvedValue([
      {
        id: 'n1',
        canonicalName: 'Rose',
        description: null,
        aliases: [],
      },
    ]);

    const result = await service.resolve(tx as unknown as Prisma.TransactionClient, [
      'Rose',
      '  Rose  ',
    ]);

    expect(result.resolved).toHaveLength(1);
    expect(result.unresolved).toEqual([]);
  });
});
