import type { PyramidLevel } from '../../../../../domain/catalog/perfume/entities/perfume.aggregate';
import type { ApproveSubmissionLayer } from './approve-submission.command';
import type {
  ResolvedAccordRef,
  ResolvedPerfumerRef,
} from '../submit-new-perfume/submit-new-perfume.types';

export interface ResolvedNotePayload {
  rawName: string;
  level: PyramidLevel;
  canonicalNoteId: string | null;
}

export interface ResolvedPayload {
  brandId: string | null;
  collectionId: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  storeUrl: string | null;
  releaseYear: number | null;
  perfumers: ResolvedPerfumerRef[];
  notes: ResolvedNotePayload[];
  accords: ResolvedAccordRef[];
}

export interface ApproveSubmissionInput {
  submissionId: string;
  layers: ReadonlyArray<ApproveSubmissionLayer>;
}

export interface ApproveSubmissionMaterializedCounts {
  perfume: true;
  perfumeNotes: number;
  accords: number;
  perfumers: number;
  histograms: number;
}

export interface ApproveSubmissionResult {
  perfumeId: string;
  submissionId: string;
  status: 'APPROVED';
  materialized: ApproveSubmissionMaterializedCounts;
}
