import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import {
  CheckerStatus,
  PerfumeSubmissionPayload,
} from '../../../application/submissions/submission.types';
import { DuplicateSignatureChecker, similarity } from './duplicate-signature.checker';

describe('similarity', () => {
  it('returns 1 for identical strings', () => {
    expect(similarity('rose', 'rose')).toBe(1);
  });

  it('returns 0 for completely different strings of equal length', () => {
    expect(similarity('abcd', 'wxyz')).toBe(0);
  });

  it('handles partial similarity', () => {
    expect(similarity('rose', 'rosy')).toBeGreaterThan(0.5);
    expect(similarity('rose', 'rosy')).toBeLessThan(1);
  });
});

describe('DuplicateSignatureChecker', () => {
  const makeTx = (rows: Array<{ id: string; name: string; slug: string }>) =>
    ({
      perfume: {
        findMany: jest.fn().mockResolvedValue(rows),
      },
    }) as unknown as Prisma.TransactionClient;

  it('returns PASS with no similar perfumes when there are no candidates', async () => {
    const prisma = {
      perfume: { findMany: jest.fn() },
    } as unknown as PrismaService;
    const checker = new DuplicateSignatureChecker(prisma);

    const result = await checker.check(
      makeTx([]),
      { name: 'New Perfume', brandName: 'Acme' } as PerfumeSubmissionPayload,
      'brand-1',
    );

    expect(result.status).toBe(CheckerStatus.PASS);
    expect(result.similarPerfumes).toEqual([]);
    expect(result.exactDuplicate).toBe(false);
  });

  it('returns FAIL on exact duplicate', async () => {
    const prisma = {
      perfume: { findMany: jest.fn() },
    } as unknown as PrismaService;
    const checker = new DuplicateSignatureChecker(prisma);

    const result = await checker.check(
      makeTx([{ id: 'p1', name: 'Acme Eau de Parfum', slug: 'acme-edp' }]),
      { name: 'Acme Eau de Parfum', brandName: 'Acme' } as PerfumeSubmissionPayload,
      'brand-1',
    );

    expect(result.exactDuplicate).toBe(true);
    expect(result.status).toBe(CheckerStatus.FAIL);
  });

  it('returns WARN on moderate similarity (≥ 0.8)', async () => {
    const prisma = {
      perfume: { findMany: jest.fn() },
    } as unknown as PrismaService;
    const checker = new DuplicateSignatureChecker(prisma);

    const result = await checker.check(
      makeTx([{ id: 'p1', name: 'Acme Eau de Parfum EDP', slug: 'acme-edp-edp' }]),
      { name: 'Acme Eau de Parfum', brandName: 'Acme' } as PerfumeSubmissionPayload,
      'brand-1',
    );

    expect(result.status).toBe(CheckerStatus.WARN);
    expect(result.similarPerfumes).toHaveLength(1);
  });

  it('computes a stable signature from brandName + name', async () => {
    const prisma = {
      perfume: { findMany: jest.fn() },
    } as unknown as PrismaService;
    const checker = new DuplicateSignatureChecker(prisma);

    const result = await checker.check(
      makeTx([]),
      { name: 'Acme Eau de Parfum', brandName: 'Acme' } as PerfumeSubmissionPayload,
      'brand-1',
    );

    expect(result.signature).toBe('acme::acme eau de parfum');
  });
});
