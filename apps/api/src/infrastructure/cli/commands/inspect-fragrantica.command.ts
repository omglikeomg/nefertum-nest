import { Command, CommandRunner, Option } from 'nest-commander';
import { Injectable, Logger } from '@nestjs/common';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

import { FragranticaScraperService } from '../scraper/fragrantica-scraper.service';
import type { ScrapedPerfume } from '../scraper/scraper.types';

interface InspectCommandOptions {
  url?: string;
  out?: string;
}

interface InspectSnapshot {
  url: string;
  scrapedAt: string;
  selectors: { title: string; brand: string; releaseYear: string; description: string };
  data: ScrapedPerfume;
  parseFailures: Array<{ field: string; reason: string }>;
}

@Command({
  name: 'inspect-fragrantica',
  description:
    'Scrape a single Fragrantica URL and write a structured JSON snapshot. Never writes to the database.',
})
@Injectable()
export class InspectFragranticaCommand extends CommandRunner {
  private readonly logger = new Logger(InspectFragranticaCommand.name);

  constructor(private readonly scraper: FragranticaScraperService) {
    super();
  }

  async run(
    _passedParams: readonly string[],
    options?: InspectCommandOptions,
  ): Promise<void> {
    const url = options?.url;
    if (!url) {
      throw new Error('--url <fragrantica-url> is required.');
    }

    const slugMatch = url.match(/\/([^/?#]+)(?:\.html)?$/);
    const slug = slugMatch?.[1] ?? `inspect-${Date.now()}`;
    const outPath =
      options.out ?? path.join('fixtures', 'inspect-output', `${slug}.json`);

    await fs.mkdir(path.dirname(outPath), { recursive: true });

    try {
      const scraped = await this.scraper.scrape(url);
      const snapshot: InspectSnapshot = {
        url,
        scrapedAt: new Date().toISOString(),
        selectors: {
          title: 'h1[itemprop="name"], h1',
          brand: 'a[itemprop="url"], .brand a, .vendor a',
          releaseYear: 'time[itemprop="releaseDate"], time, .release',
          description: '[itemprop="description"]',
        },
        data: scraped,
        parseFailures: this.collectParseFailures(scraped),
      };

      await fs.writeFile(outPath, JSON.stringify(snapshot, null, 2), 'utf8');
      this.logger.log(
        `Wrote snapshot to ${outPath} (parseFailures=${snapshot.parseFailures.length})`,
      );
    } finally {
      await this.scraper.close();
    }
  }

  private collectParseFailures(scraped: ScrapedPerfume): Array<{
    field: string;
    reason: string;
  }> {
    const failures: Array<{ field: string; reason: string }> = [];
    if (!scraped.title) failures.push({ field: 'title', reason: 'missing' });
    if (!scraped.brand) failures.push({ field: 'brand', reason: 'missing' });
    if (scraped.releaseYear === null) {
      failures.push({ field: 'releaseYear', reason: 'missing' });
    }
    if (
      scraped.notePyramid.TOP.length === 0 &&
      scraped.notePyramid.HEART.length === 0 &&
      scraped.notePyramid.BASE.length === 0
    ) {
      failures.push({ field: 'notePyramid', reason: 'empty' });
    }
    return failures;
  }

  @Option({ flags: '--url <url>', description: 'Fragrantica URL to scrape' })
  parseUrl(val: string): string {
    return val;
  }

  @Option({
    flags: '--out <path>',
    description:
      'Override output path (default: fixtures/inspect-output/<slug>.json)',
  })
  parseOut(val: string): string {
    return val;
  }
}
