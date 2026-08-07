import { Command, CommandRunner, Option } from 'nest-commander';
import { CommandBus } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { FragranticaScraperService } from '../scraper/fragrantica-scraper.service';
import type { ApproveSubmissionLayer } from '../../../application/catalog/perfume/commands/approve-submission/approve-submission.command';
import { iterateUrls, parseFixtureUrls } from './seed-base';
import { runSeedPipeline } from './seed-pipeline';

interface SeedCommandOptions {
  fixture?: string;
  url?: string;
  delay?: string;
  dryRun?: boolean;
}

export abstract class SeedBaseCommand extends CommandRunner {
  protected readonly logger: Logger;

  constructor(
    protected readonly scraper: FragranticaScraperService,
    protected readonly prisma: PrismaService,
    protected readonly commandBus: CommandBus,
    layerName: string,
  ) {
    super();
    this.logger = new Logger(layerName);
  }

  protected abstract getLayers(): ReadonlyArray<ApproveSubmissionLayer>;

  async run(
    _passedParams: readonly string[],
    options?: SeedCommandOptions,
  ): Promise<void> {
    const urls = await this.resolveUrls(options);
    if (urls.length === 0) {
      this.logger.error('No URLs to seed (pass --url or --fixture).');
      process.exit(1);
    }

    const delayMs = options?.delay ? Number.parseInt(options.delay, 10) : 2000;
    const dryRun = Boolean(options?.dryRun);

    let succeeded = 0;
    let failed = 0;

    const result = await iterateUrls({
      urls,
      delayMs,
      onUrl: async (url, ctx) => {
        this.logger.log(`[${ctx.index}/${ctx.total}] scraping ${url}`);
        let scraped;
        try {
          scraped = await this.scraper.scrape(url);
        } finally {
          await this.scraper.close();
        }

        if (!scraped.title || !scraped.brand) {
          this.logger.warn(
            `[${ctx.index}/${ctx.total}] skipping ${url} — missing title/brand (likely Cloudflare challenge).`,
          );
          return;
        }

        if (dryRun) {
          this.logger.log(
            `[${ctx.index}/${ctx.total}] DRY-RUN ${url}: would seed "${scraped.title}" by ${scraped.brand} (notes=${scraped.notePyramid.TOP.length + scraped.notePyramid.HEART.length + scraped.notePyramid.BASE.length}, accords=${scraped.accordBars.length}, perfumers=${scraped.perfumers.length}, histograms=${Object.keys(scraped.histograms).length})`,
          );
          return;
        }

        const layers = this.getLayers();
        const outcome = await runSeedPipeline({
          prisma: this.prisma,
          commandBus: this.commandBus,
          scraper: this.scraper,
          scraped,
          url,
          layers,
        });
        this.logger.log(
          `[${ctx.index}/${ctx.total}] OK ${url} → perfume=${outcome.perfumeId} submission=${outcome.submissionId} layers=${JSON.stringify(outcome.attempted)}`,
        );
      },
      onLog: (line) => this.logger.warn(line),
    });
    succeeded = result.succeeded;
    failed = result.failed;

    this.logger.log(`Done. succeeded=${succeeded} failed=${failed}`);
    if (failed > 0) {
      process.exit(1);
    }
  }

  private async resolveUrls(
    options?: SeedCommandOptions,
  ): Promise<readonly string[]> {
    if (options?.url) {
      return [options.url];
    }
    if (options?.fixture) {
      return parseFixtureUrls(options.fixture);
    }
    return [];
  }

  @Option({
    flags: '--fixture <path>',
    description: 'Path to URL list (one per line).',
  })
  parseFixture(val: string): string {
    return val;
  }

  @Option({
    flags: '--url <url>',
    description: 'Single URL override; takes precedence over --fixture.',
  })
  parseUrl(val: string): string {
    return val;
  }

  @Option({
    flags: '--delay <ms>',
    description: 'Delay between requests in ms (default: 2000).',
  })
  parseDelay(val: string): number {
    return Number.parseInt(val, 10);
  }

  @Option({
    flags: '--dry-run',
    description: 'Scrape and resolve but do not write to the DB.',
  })
  parseDryRun(): boolean {
    return true;
  }
}

@Command({
  name: 'catalog-min',
  description:
    'Seed perfumes at the catalog-min layer (Perfume + PerfumeNote).',
})
@Injectable()
export class SeedCatalogMinCommand extends SeedBaseCommand {
  constructor(
    scraper: FragranticaScraperService,
    prisma: PrismaService,
    commandBus: CommandBus,
  ) {
    super(scraper, prisma, commandBus, 'SeedCatalogMinCommand');
  }

  protected getLayers(): ReadonlyArray<ApproveSubmissionLayer> {
    return ['catalog-min'];
  }
}
