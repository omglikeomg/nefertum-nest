import { Injectable } from '@nestjs/common';
import type { CheerioAPI } from 'cheerio';

import type { HistogramBuckets } from './scraper.types';

const METRIC_SELECTORS: Record<keyof HistogramBuckets, string> = {
  GENDER: '#gender-votes',
  LONGEVITY: '#longevity-votes',
  SILLAGE: '#sillage-votes',
  VALUE: '#value-votes',
};

function emptyBuckets(): Record<0 | 1 | 2 | 3 | 4, number> {
  return { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
}

@Injectable()
export class HistogramExtractorService {
  extract($: CheerioAPI): HistogramBuckets {
    const result = {
      GENDER: emptyBuckets(),
      LONGEVITY: emptyBuckets(),
      SILLAGE: emptyBuckets(),
      VALUE: emptyBuckets(),
    } as HistogramBuckets;

    for (const metric of Object.keys(METRIC_SELECTORS) as Array<keyof HistogramBuckets>) {
      if (metric === 'VALUE') {
        continue;
      }
      const container = $(METRIC_SELECTORS[metric]).first();
      if (container.length === 0) {
        continue;
      }
      const titleAttr = container.attr('title') ?? '';
      const match = titleAttr.match(/(-?\d+)\s*votes?/i);
      if (!match) {
        continue;
      }
      const votes = Number.parseInt(match[1], 10);
      if (!Number.isFinite(votes) || votes < 0) {
        continue;
      }
      result[metric][0] = votes;
    }

    return result;
  }
}
