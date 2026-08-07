import { Injectable } from '@nestjs/common';

import {
  BrandResolutionCheckerResult,
  ConfidenceResult,
  DuplicateSignatureCheckerResult,
  NoteTaxonomyCheckerResult,
  UrlAndImageHealthCheckerResult,
} from '../../../application/submissions/submission.types';

const AUTO_APPROVAL_THRESHOLD_DEFAULT = 99;
const MIN_TRUSTED_APPROVED_SUBMISSIONS = 5;

export interface ConfidenceInput {
  brand: BrandResolutionCheckerResult;
  notes: NoteTaxonomyCheckerResult;
  urlAndImage: UrlAndImageHealthCheckerResult;
  duplicate: DuplicateSignatureCheckerResult;
  isLowTrustSubmitter: boolean;
  mandatoryFieldsPresent: boolean;
}

const HARD_CAP = 98.99;

@Injectable()
export class ConfidenceCalculator {
  calculate(input: ConfidenceInput): ConfidenceResult {
    const hardFailures: string[] = [];
    let score = 100;

    if (!input.mandatoryFieldsPresent) {
      score -= 100;
      hardFailures.push('MANDATORY_FIELDS_MISSING');
    }

    if (input.brand.code === 'MISSING_BRAND') {
      score -= 100;
      hardFailures.push('MISSING_BRAND');
    } else if (input.brand.code === 'NOVEL_BRAND') {
      score -= 40;
      hardFailures.push('NOVEL_BRAND');
    } else if (input.brand.code === 'INVALID_BRAND_ID') {
      score -= 25;
      hardFailures.push('INVALID_BRAND_ID');
    }

    const unmappedCount = input.notes.unmappedRawNames.length;
    if (unmappedCount > 0) {
      score -= Math.min(unmappedCount * 15, 45);
      hardFailures.push('UNMAPPED_NOTES');
    }

    if (input.notes.mappedNotes.length === 0 && input.notes.unmappedRawNames.length > 0) {
      score -= 30;
      hardFailures.push('NO_MAPPED_NOTES');
    }

    if (
      input.urlAndImage.storeUrlOk === false &&
      input.urlAndImage.errors.some((e) => /storeUrl/i.test(e))
    ) {
      score -= 20;
      hardFailures.push('STORE_URL_FAILED');
    }

    if (
      input.urlAndImage.imageUrlOk === false &&
      input.urlAndImage.errors.some((e) => /imageUrl/i.test(e))
    ) {
      score -= 30;
      hardFailures.push('IMAGE_HEALTH_FAILED');
    }

    if (input.duplicate.exactDuplicate) {
      score -= 80;
      hardFailures.push('EXACT_DUPLICATE');
    } else if (input.duplicate.maxSimilarity >= 0.92) {
      score -= 45;
      hardFailures.push('HIGH_DUPLICATE_SIMILARITY');
    } else if (input.duplicate.maxSimilarity >= 0.8) {
      score -= 20;
    }

    if (input.isLowTrustSubmitter) {
      const deduction = MIN_TRUSTED_APPROVED_SUBMISSIONS > 0 ? -45 : -30;
      score += deduction;
      hardFailures.push('LOW_TRUST_SUBMITTER');
    }

    if (hardFailures.length > 0 && score > HARD_CAP) {
      score = HARD_CAP;
    }

    if (score < 0) {
      score = 0;
    }

    const threshold = Math.max(
      Number(process.env.AUTO_APPROVAL_THRESHOLD ?? AUTO_APPROVAL_THRESHOLD_DEFAULT),
      AUTO_APPROVAL_THRESHOLD_DEFAULT,
    );

    const autoApprovable = hardFailures.length === 0 && score >= threshold;

    return { score, hardFailures, autoApprovable };
  }
}
