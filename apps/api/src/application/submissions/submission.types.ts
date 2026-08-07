import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Length,
  validateSync,
} from 'class-validator';

import type { PyramidLevel } from '../../domain/catalog/perfume/entities/perfume.aggregate';

export const PERFUME_SUBMISSION_QUEUE = 'perfume-submissions';

export interface PerfumeSubmissionJobData {
  submissionId: string;
}

export enum CheckerStatus {
  PASS = 'PASS',
  WARN = 'WARN',
  FAIL = 'FAIL',
}

export interface MappedSubmissionNote {
  rawName: string;
  canonicalNoteId: string;
  canonicalName: string;
  level?: PyramidLevel;
}

export interface BrandResolutionCheckerResult {
  status: CheckerStatus;
  code: 'RESOLVED' | 'NOVEL_BRAND' | 'MISSING_BRAND' | 'INVALID_BRAND_ID';
  resolvedBrandId?: string;
  resolvedBrandName?: string;
  message?: string;
}

export interface NoteTaxonomyCheckerResult {
  status: CheckerStatus;
  mappedNotes: MappedSubmissionNote[];
  unmappedRawNames: string[];
  message?: string;
}

export interface UrlAndImageHealthCheckerResult {
  status: CheckerStatus;
  storeUrlOk: boolean;
  imageUrlOk: boolean;
  imageContentType?: string;
  errors: string[];
}

export interface DuplicateSignatureCheckerResult {
  status: CheckerStatus;
  signature: string;
  exactDuplicate: boolean;
  maxSimilarity: number;
  similarPerfumes: { id: string; name: string; slug: string; similarity: number }[];
}

export interface ConfidenceResult {
  score: number;
  hardFailures: string[];
  autoApprovable: boolean;
}

export interface CheckReport {
  brand: BrandResolutionCheckerResult;
  notes: NoteTaxonomyCheckerResult;
  urlAndImage: UrlAndImageHealthCheckerResult;
  duplicate: DuplicateSignatureCheckerResult;
  confidence: ConfidenceResult;
}

export class PerfumeSubmissionPayload {
  @IsString()
  @Length(1, 200)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  brandName?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  rawNotes?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  rawPerfumers?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  accords?: string[];

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  storeUrl?: string;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  releaseYear?: number;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  description?: string;
}

export function parsePerfumeSubmissionPayload(raw: unknown): PerfumeSubmissionPayload {
  const instance = plainToInstance(PerfumeSubmissionPayload, raw, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(instance, {
    whitelist: true,
    forbidNonWhitelisted: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((err) => Object.values(err.constraints ?? {}).join('; '))
      .filter(Boolean)
      .join('; ');
    throw new BadRequestException(messages || 'Invalid submission payload.');
  }

  return instance;
}

export function isUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}
