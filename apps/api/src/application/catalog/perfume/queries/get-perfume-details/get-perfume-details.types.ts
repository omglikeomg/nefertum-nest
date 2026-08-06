import type { AccordSource } from '@prisma/client';
import type { ScaleMetric } from '../../../../../domain/catalog/perfume/value-objects/scale-histogram.vo';

export interface PerfumeDetailsBrand {
  id: string;
  name: string;
  slug: string;
}

export interface PerfumeDetailsCollection {
  id: string;
  name: string;
  slug: string;
}

export interface PerfumeDetailsPerfumer {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export interface PerfumeDetailsNote {
  noteId: string;
  canonicalName: string;
  slug: string;
  order: number;
}

export interface PerfumeDetailsNotePyramid {
  top: PerfumeDetailsNote[];
  heart: PerfumeDetailsNote[];
  base: PerfumeDetailsNote[];
}

export interface PerfumeDetailsAccord {
  id: string;
  name: string;
  slug: string;
  source: AccordSource;
  weight: number;
}

export interface PerfumeDetailsScaleHistogram {
  metric: ScaleMetric;
  buckets: Readonly<Record<number, number>>;
  totalVotes: number;
}

export interface PerfumeDetailsRelation {
  perfumeId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  score: number;
  upvotes: number;
  downvotes: number;
}

export interface PerfumeDetailsReview {
  id: string;
  title: string | null;
  content: string;
  authorUsername: string;
  score: number;
  createdAt: Date;
}

export interface PerfumeDetailsResult {
  id: string;
  brand: PerfumeDetailsBrand;
  collection: PerfumeDetailsCollection | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  storeUrl: string | null;
  releaseYear: number | null;
  discontinued: boolean;
  discontinuationNotes: string | null;
  perfumers: PerfumeDetailsPerfumer[];
  notes: PerfumeDetailsNotePyramid;
  accords: PerfumeDetailsAccord[];
  scaleHistograms: PerfumeDetailsScaleHistogram[];
  remindsMeOf: PerfumeDetailsRelation[];
  peopleAlsoLike: PerfumeDetailsRelation[];
  latestReviews: PerfumeDetailsReview[];
}
