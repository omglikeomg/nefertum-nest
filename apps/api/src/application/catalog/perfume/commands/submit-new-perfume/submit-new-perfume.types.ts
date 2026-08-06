import type { SubmissionStatus } from '@prisma/client';
import type { PyramidLevel } from '../../../../../domain/catalog/perfume/entities/perfume.aggregate';

export interface RawNoteInput {
  rawName: string;
  level: PyramidLevel;
}

export interface SubmitNewPerfumeInput {
  submittedBy: string;
  name: string;
  brandId?: string;
  brandName?: string;
  collectionId?: string | null;
  description?: string;
  imageUrl?: string;
  storeUrl?: string;
  releaseYear?: number | null;
  rawPerfumerNames?: readonly string[];
  rawNotes?: readonly RawNoteInput[];
  rawAccords?: readonly string[];
}

export interface ResolvedNoteRef {
  rawName: string;
  canonicalNoteId: string;
  canonicalName: string;
}

export interface ResolvedPerfumerRef {
  rawName: string;
  perfumerId: string;
  perfumerName: string;
}

export interface ResolvedAccordRef {
  rawName: string;
  accordId: string;
  accordName: string;
}

export interface SubmitNewPerfumeResult {
  submissionId: string;
  status: SubmissionStatus;
  missingRequirements: readonly string[];
  resolvedBrandId: string | null;
  resolvedNotes: readonly ResolvedNoteRef[];
  unresolvedNotes: readonly string[];
  resolvedPerfumers: readonly ResolvedPerfumerRef[];
  unresolvedPerfumers: readonly string[];
  resolvedAccords: readonly ResolvedAccordRef[];
  unresolvedAccords: readonly string[];
}
