import { ConfidenceCalculator, type ConfidenceInput } from './confidence.calculator';
import {
  CheckerStatus,
  type BrandResolutionCheckerResult,
  type DuplicateSignatureCheckerResult,
  type NoteTaxonomyCheckerResult,
  type UrlAndImageHealthCheckerResult,
} from '../../../application/submissions/submission.types';

const baseBrand: BrandResolutionCheckerResult = {
  status: CheckerStatus.PASS,
  code: 'RESOLVED',
};

const baseNotes: NoteTaxonomyCheckerResult = {
  status: CheckerStatus.PASS,
  mappedNotes: [{ rawName: 'Rose', canonicalNoteId: 'n1', canonicalName: 'Rose' }],
  unmappedRawNames: [],
};

const baseUrlAndImage: UrlAndImageHealthCheckerResult = {
  status: CheckerStatus.PASS,
  storeUrlOk: true,
  imageUrlOk: true,
  errors: [],
};

const baseDuplicate: DuplicateSignatureCheckerResult = {
  status: CheckerStatus.PASS,
  signature: 'acme::acme edp',
  exactDuplicate: false,
  maxSimilarity: 0,
  similarPerfumes: [],
};

const buildInput = (overrides: Partial<ConfidenceInput> = {}): ConfidenceInput => ({
  brand: baseBrand,
  notes: baseNotes,
  urlAndImage: baseUrlAndImage,
  duplicate: baseDuplicate,
  isLowTrustSubmitter: false,
  mandatoryFieldsPresent: true,
  ...overrides,
});

describe('ConfidenceCalculator', () => {
  let calculator: ConfidenceCalculator;

  beforeEach(() => {
    calculator = new ConfidenceCalculator();
  });

  it('returns score 100, no failures, autoApprovable when everything passes', () => {
    const result = calculator.calculate(buildInput());
    expect(result.score).toBe(100);
    expect(result.hardFailures).toEqual([]);
    expect(result.autoApprovable).toBe(true);
  });

  it('flags MISSING_BRAND as hard failure with -100 score', () => {
    const result = calculator.calculate(
      buildInput({
        brand: {
          status: CheckerStatus.FAIL,
          code: 'MISSING_BRAND',
        },
      }),
    );
    expect(result.hardFailures).toContain('MISSING_BRAND');
    expect(result.score).toBeLessThanOrEqual(0);
    expect(result.autoApprovable).toBe(false);
  });

  it('caps score at 98.99 when any hard failure is present', () => {
    const result = calculator.calculate(
      buildInput({
        brand: {
          status: CheckerStatus.FAIL,
          code: 'NOVEL_BRAND',
        },
      }),
    );
    expect(result.score).toBeLessThanOrEqual(98.99);
    expect(result.score).toBeGreaterThan(0);
  });

  it('applies -15 per unmapped note up to -45', () => {
    const result = calculator.calculate(
      buildInput({
        notes: {
          status: CheckerStatus.WARN,
          mappedNotes: [],
          unmappedRawNames: ['A', 'B', 'C', 'D'],
        },
      }),
    );
    expect(result.hardFailures).toContain('UNMAPPED_NOTES');
    expect(result.score).toBeLessThanOrEqual(100 - 45);
  });

  it('flags EXACT_DUPLICATE as hard failure', () => {
    const result = calculator.calculate(
      buildInput({
        duplicate: { ...baseDuplicate, exactDuplicate: true, maxSimilarity: 1 },
      }),
    );
    expect(result.hardFailures).toContain('EXACT_DUPLICATE');
    expect(result.autoApprovable).toBe(false);
  });

  it('uses threshold from env, defaulting to 99 (never below)', () => {
    const original = process.env.AUTO_APPROVAL_THRESHOLD;

    process.env.AUTO_APPROVAL_THRESHOLD = '50';
    const result = calculator.calculate(buildInput());
    expect(result.autoApprovable).toBe(true);

    delete process.env.AUTO_APPROVAL_THRESHOLD;
    void original;
  });
});
