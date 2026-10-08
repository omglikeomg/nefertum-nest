import { BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../../../../infrastructure/database/prisma/prisma.service';
import { GetPerfumesForComparisonQuery } from './get-perfumes-for-comparison.query';
import { GetPerfumesForComparisonQueryHandler } from './get-perfumes-for-comparison.handler';

const row = (id: string) => ({
  id,
  name: `Name ${id}`,
  slug: `slug-${id}`,
  brand: { id: 'b1', name: 'Chanel', slug: 'chanel' },
  notes: [
    { level: 'TOP', order: 0, note: { id: 'n1', canonicalName: 'Grapefruit', slug: 'grapefruit' } },
  ],
  scaleHistograms: [
    { metric: 'SILLAGE', buckets: { '0': 5, '1': 4, '2': 3, '3': 2, '4': 1 }, totalVotes: 15 },
    { metric: 'LONGEVITY', buckets: { '0': 1, '1': 2, '2': 3, '3': 4, '4': 5 }, totalVotes: 15 },
  ],
});

describe('GetPerfumesForComparisonQueryHandler', () => {
  let findMany: jest.Mock;
  let handler: GetPerfumesForComparisonQueryHandler;
  const run = (ids: string[]) => handler.execute(new GetPerfumesForComparisonQuery(ids));

  beforeEach(() => {
    findMany = jest.fn();
    handler = new GetPerfumesForComparisonQueryHandler({
      perfume: { findMany },
    } as unknown as PrismaService);
  });

  it('COMPARE-API-1: returns id, name, slug, brand, note pyramid and histograms for each match', async () => {
    findMany.mockResolvedValue([row('a')]);
    const [item] = await run(['a']);
    expect(item).toEqual({
      id: 'a',
      name: 'Name a',
      slug: 'slug-a',
      brand: { id: 'b1', name: 'Chanel', slug: 'chanel' },
      notes: {
        top: [{ noteId: 'n1', canonicalName: 'Grapefruit', slug: 'grapefruit', order: 0 }],
        heart: [],
        base: [],
      },
      scaleHistograms: [
        { metric: 'LONGEVITY', buckets: [1, 2, 3, 4, 5], totalVotes: 15 },
        { metric: 'SILLAGE', buckets: [5, 4, 3, 2, 1], totalVotes: 15 },
      ],
    });
  });

  it('COMPARE-API-2: keeps the order of first appearance in the input', async () => {
    findMany.mockResolvedValue([row('a'), row('b'), row('c')]);
    expect((await run(['c', 'a', 'b'])).map((p) => p.id)).toEqual(['c', 'a', 'b']);
  });

  it('COMPARE-API-3: returns a repeated ID once and queries it once', async () => {
    findMany.mockResolvedValue([row('a'), row('b')]);
    expect((await run(['a', 'b', 'a'])).map((p) => p.id)).toEqual(['a', 'b']);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['a', 'b'] } } }),
    );
  });

  it('COMPARE-API-4: omits unknown, empty and non-UUID IDs without an error', async () => {
    findMany.mockResolvedValue([row('a')]);
    expect((await run(['missing', 'a', '', 'not-a-uuid'])).map((p) => p.id)).toEqual(['a']);
  });

  it('COMPARE-API-5: rejects more than 50 IDs before querying the database', async () => {
    await expect(run(Array.from({ length: 51 }, (_, i) => `id-${i}`))).rejects.toThrow(
      new BadRequestException('At most 50 perfume IDs can be compared at once.'),
    );
    expect(findMany).not.toHaveBeenCalled();
  });

  it('COMPARE-API-5: counts duplicates towards the limit of 50', async () => {
    await expect(run([...Array(60)].map((_, i) => `id-${i % 10}`))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('COMPARE-API-5: accepts exactly 50 IDs', async () => {
    findMany.mockResolvedValue([]);
    await expect(run(Array.from({ length: 50 }, (_, i) => `id-${i}`))).resolves.toEqual([]);
  });

  it('COMPARE-API-6: fills a missing histogram and missing buckets with zeros', async () => {
    findMany.mockResolvedValue([
      { ...row('a'), scaleHistograms: [{ metric: 'SILLAGE', buckets: { '2': 7 }, totalVotes: 7 }] },
    ]);
    const [item] = await run(['a']);
    expect(item.scaleHistograms).toEqual([
      { metric: 'LONGEVITY', buckets: [0, 0, 0, 0, 0], totalVotes: 0 },
      { metric: 'SILLAGE', buckets: [0, 0, 7, 0, 0], totalVotes: 7 },
    ]);
  });

  it('returns an empty list for no IDs without querying the database', async () => {
    expect(await run([])).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});
