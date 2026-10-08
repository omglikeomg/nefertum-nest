import type {
  PerfumeDetailsBrand,
  PerfumeDetailsNotePyramid,
} from '../get-perfume-details/get-perfume-details.types';

export const COMPARISON_METRICS = ['LONGEVITY', 'SILLAGE'] as const;
export type ComparisonMetric = (typeof COMPARISON_METRICS)[number];

export const MAX_COMPARISON_IDS = 50;

export interface PerfumeComparisonScaleHistogram {
  metric: ComparisonMetric;
  buckets: number[];
  totalVotes: number;
}

export interface PerfumeComparisonItem {
  id: string;
  name: string;
  slug: string;
  brand: PerfumeDetailsBrand;
  notes: PerfumeDetailsNotePyramid;
  scaleHistograms: PerfumeComparisonScaleHistogram[];
}
