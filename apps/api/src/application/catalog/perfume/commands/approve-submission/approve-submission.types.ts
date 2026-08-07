import type { PyramidLevel } from '../../../../../domain/catalog/perfume/entities/perfume.aggregate';
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

export interface NoteMapping {
  rawName?: string;
  canonicalNoteId: string;
  level?: PyramidLevel;
}

export interface NoteAssignment {
  canonicalNoteId: string;
  level: PyramidLevel;
}

export interface ApproveSubmissionOverrides {
  brandId?: string;
  brandName?: string;
  collectionId?: string | null;
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  storeUrl?: string | null;
  releaseYear?: number | null;
  perfumerIds?: string[];
  noteMappings?: NoteMapping[];
  noteAssignments?: NoteAssignment[];
}

export interface ApproveSubmissionInput {
  submissionId: string;
  approvedBy?: string | null;
  autoApproved?: boolean;
  overrides?: ApproveSubmissionOverrides;
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
  alreadyApproved: boolean;
  materialized: ApproveSubmissionMaterializedCounts;
}
