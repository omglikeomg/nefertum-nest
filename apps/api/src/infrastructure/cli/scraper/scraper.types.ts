import type { ScaleMetric } from '../../../domain/catalog/perfume/value-objects/scale-histogram.vo';
import type { PyramidLevel } from '../../../domain/catalog/perfume/entities/perfume.aggregate';

export interface AccordBar {
  label: string;
  weightPct: number;
  rawStyle: string;
}

export interface ScrapedPerfumer {
  name: string;
  bio: string | null;
}

export type NotePyramid = Record<PyramidLevel, readonly string[]>;

export type HistogramBuckets = Record<ScaleMetric, Record<0 | 1 | 2 | 3 | 4, number>>;

export interface ScrapedPerfume {
  title: string | null;
  brand: string | null;
  releaseYear: number | null;
  description: string | null;
  accordBars: AccordBar[];
  notePyramid: NotePyramid;
  perfumers: ScrapedPerfumer[];
  histograms: HistogramBuckets;
}
