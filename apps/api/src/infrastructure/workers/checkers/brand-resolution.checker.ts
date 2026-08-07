import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  BrandResolutionService,
  type BrandResolutionCode,
} from '../../../application/catalog/perfume/services/brand-resolution.service';
import {
  BrandResolutionCheckerResult,
  CheckerStatus,
  PerfumeSubmissionPayload,
} from '../../../application/submissions/submission.types';

const CODE_TO_STATUS: Record<BrandResolutionCode, CheckerStatus> = {
  RESOLVED: CheckerStatus.PASS,
  NOVEL_BRAND: CheckerStatus.FAIL,
  MISSING_BRAND: CheckerStatus.FAIL,
  INVALID_BRAND_ID: CheckerStatus.FAIL,
};

@Injectable()
export class BrandResolutionChecker {
  constructor(private readonly brandResolver: BrandResolutionService) {}

  async check(
    tx: Prisma.TransactionClient,
    payload: PerfumeSubmissionPayload,
  ): Promise<BrandResolutionCheckerResult> {
    const result = await this.brandResolver.resolve(
      tx,
      payload.brandId ?? null,
      payload.brandName ?? null,
    );

    return {
      status: CODE_TO_STATUS[result.code],
      code: result.code,
      resolvedBrandId: result.brand?.id,
      resolvedBrandName: result.brand?.name,
      message: this.messageFor(result.code),
    };
  }

  private messageFor(code: BrandResolutionCode): string {
    switch (code) {
      case 'RESOLVED':
        return 'Brand resolved.';
      case 'NOVEL_BRAND':
        return 'Brand name not found in catalog — flagged for review.';
      case 'INVALID_BRAND_ID':
        return 'Provided brandId does not exist.';
      case 'MISSING_BRAND':
      default:
        return 'No brandId or brandName provided.';
    }
  }
}
