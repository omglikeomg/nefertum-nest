import { Prisma } from '@prisma/client';

import { BrandResolutionService } from './brand-resolution.service';

type TxMock = {
  brand: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
  };
};

const makeTx = (): TxMock => ({
  brand: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
});

describe('BrandResolutionService', () => {
  let service: BrandResolutionService;

  beforeEach(() => {
    service = new BrandResolutionService();
  });

  it('returns RESOLVED when brandId matches an existing brand', async () => {
    const tx = makeTx();
    const brand = { id: 'b1', name: 'Acme' };
    tx.brand.findUnique.mockResolvedValue(brand);

    const result = await service.resolve(tx as unknown as Prisma.TransactionClient, 'b1');

    expect(result).toEqual({ brand, code: 'RESOLVED' });
    expect(tx.brand.findUnique).toHaveBeenCalledWith({ where: { id: 'b1' } });
    expect(tx.brand.findFirst).not.toHaveBeenCalled();
  });

  it('returns INVALID_BRAND_ID when brandId does not resolve', async () => {
    const tx = makeTx();
    tx.brand.findUnique.mockResolvedValue(null);

    const result = await service.resolve(tx as unknown as Prisma.TransactionClient, 'missing-id');

    expect(result).toEqual({ brand: null, code: 'INVALID_BRAND_ID' });
  });

  it('returns RESOLVED when brandName (case-insensitive, trimmed) matches', async () => {
    const tx = makeTx();
    const brand = { id: 'b2', name: 'Acme' };
    tx.brand.findFirst.mockResolvedValue(brand);

    const result = await service.resolve(
      tx as unknown as Prisma.TransactionClient,
      null,
      '  acme  ',
    );

    expect(result).toEqual({ brand, code: 'RESOLVED' });
    expect(tx.brand.findFirst).toHaveBeenCalledWith({
      where: { name: { equals: 'acme', mode: 'insensitive' } },
    });
  });

  it('returns NOVEL_BRAND when brandName does not resolve', async () => {
    const tx = makeTx();
    tx.brand.findFirst.mockResolvedValue(null);

    const result = await service.resolve(
      tx as unknown as Prisma.TransactionClient,
      null,
      'New House',
    );

    expect(result).toEqual({ brand: null, code: 'NOVEL_BRAND' });
  });

  it('returns MISSING_BRAND when neither brandId nor brandName is provided', async () => {
    const tx = makeTx();

    const result = await service.resolve(
      tx as unknown as Prisma.TransactionClient,
      undefined,
      undefined,
    );

    expect(result).toEqual({ brand: null, code: 'MISSING_BRAND' });
    expect(tx.brand.findUnique).not.toHaveBeenCalled();
    expect(tx.brand.findFirst).not.toHaveBeenCalled();
  });

  it('prefers brandId over brandName when both are provided', async () => {
    const tx = makeTx();
    const brand = { id: 'b3', name: 'Existing' };
    tx.brand.findUnique.mockResolvedValue(brand);

    const result = await service.resolve(tx as unknown as Prisma.TransactionClient, 'b3', 'Other');

    expect(result).toEqual({ brand, code: 'RESOLVED' });
    expect(tx.brand.findFirst).not.toHaveBeenCalled();
  });
});
