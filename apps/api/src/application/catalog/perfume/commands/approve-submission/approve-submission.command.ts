import type { HistogramBuckets } from '../../../../infrastructure/cli/scraper/scraper.types';

export type ApproveSubmissionLayer =
  | 'catalog-min'
  | 'catalog-mid'
  | 'catalog-full';

export class ApproveSubmissionCommand {
  constructor(
    public readonly submissionId: string,
    public readonly layers: ReadonlyArray<ApproveSubmissionLayer> = ['catalog-min'],
    public readonly histograms: HistogramBuckets | null = null,
  ) {}
}
