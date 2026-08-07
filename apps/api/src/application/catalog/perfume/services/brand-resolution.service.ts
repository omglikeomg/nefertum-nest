import { Injectable } from '@nestjs/common';
import { Brand, Prisma } from '@prisma/client';

export type BrandResolutionCode = 'RESOLVED' | 'NOVEL_BRAND' | 'MISSING_BRAND' | 'INVALID_BRAND_ID';

export interface BrandResolutionResult {
  brand: Brand | null;
  code: BrandResolutionCode;
}

@Injectable()
export class BrandResolutionService {
  async resolve(
    tx: Prisma.TransactionClient,
    brandId?: string | null,
    brandName?: string | null,
  ): Promise<BrandResolutionResult> {
    if (brandId) {
      const brand = await tx.brand.findUnique({ where: { id: brandId } });

      if (brand) {
        return { brand, code: 'RESOLVED' };
      }

      return { brand: null, code: 'INVALID_BRAND_ID' };
    }

    if (brandName) {
      const brand = await tx.brand.findFirst({
        where: {
          name: {
            equals: brandName.trim(),
            mode: 'insensitive',
          },
        },
      });

      if (brand) {
        return { brand, code: 'RESOLVED' };
      }

      return { brand: null, code: 'NOVEL_BRAND' };
    }

    return { brand: null, code: 'MISSING_BRAND' };
  }
}
