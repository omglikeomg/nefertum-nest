import { Prisma } from '@prisma/client';

import { BrandResolutionService } from '../../../application/catalog/perfume/services/brand-resolution.service';
import {
  CheckerStatus,
  PerfumeSubmissionPayload,
} from '../../../application/submissions/submission.types';
import { BrandResolutionChecker } from './brand-resolution.checker';

describe('BrandResolutionChecker', () => {
  it('maps RESOLVED to PASS', async () => {
    const brandResolver = {
      resolve: jest.fn().mockResolvedValue({
        brand: { id: 'b1', name: 'Acme' },
        code: 'RESOLVED',
      }),
    } as unknown as BrandResolutionService;
    const checker = new BrandResolutionChecker(brandResolver);

    const result = await checker.check(
      {} as Prisma.TransactionClient,
      { name: 'X', brandId: 'b1' } as PerfumeSubmissionPayload,
    );

    expect(result.status).toBe(CheckerStatus.PASS);
    expect(result.code).toBe('RESOLVED');
    expect(result.resolvedBrandId).toBe('b1');
  });

  it('maps NOVEL_BRAND to FAIL', async () => {
    const brandResolver = {
      resolve: jest.fn().mockResolvedValue({
        brand: null,
        code: 'NOVEL_BRAND',
      }),
    } as unknown as BrandResolutionService;
    const checker = new BrandResolutionChecker(brandResolver);

    const result = await checker.check(
      {} as Prisma.TransactionClient,
      { name: 'X', brandName: 'New House' } as PerfumeSubmissionPayload,
    );

    expect(result.status).toBe(CheckerStatus.FAIL);
    expect(result.code).toBe('NOVEL_BRAND');
  });

  it('maps MISSING_BRAND to FAIL', async () => {
    const brandResolver = {
      resolve: jest.fn().mockResolvedValue({
        brand: null,
        code: 'MISSING_BRAND',
      }),
    } as unknown as BrandResolutionService;
    const checker = new BrandResolutionChecker(brandResolver);

    const result = await checker.check(
      {} as Prisma.TransactionClient,
      { name: 'X' } as PerfumeSubmissionPayload,
    );

    expect(result.status).toBe(CheckerStatus.FAIL);
    expect(result.code).toBe('MISSING_BRAND');
  });
});
