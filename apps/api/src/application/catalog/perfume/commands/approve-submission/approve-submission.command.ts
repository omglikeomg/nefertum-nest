import type { HistogramBuckets } from '../../../../../infrastructure/cli/scraper/scraper.types';

export type ApproveSubmissionLayer =
  | 'catalog-min'
  | 'catalog-mid'
  | 'catalog-full';

export interface PerfumerBioUpdate {
  perfumerId: string;
  bio: string;
}

export class ApproveSubmissionCommand {
  constructor(
    public readonly submissionId: string,
    public readonly layers: ReadonlyArray<ApproveSubmissionLayer> = ['catalog-min'],
    public readonly histograms: HistogramBuckets | null = null,
    public readonly perfumerBios: readonly PerfumerBioUpdate[] | null = null,
  ) {}
}
