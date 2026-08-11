import { Injectable, Logger } from '@nestjs/common';
import { chromium, type BrowserContext } from 'playwright';
import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';

import { HistogramExtractorService } from './histogram-extractor.service';
import type {
  AccordBar,
  HistogramBuckets,
  NotePyramid,
  ScrapedPerfumer,
  ScrapedPerfume,
} from './scraper.types';

const DEFAULT_PROFILE_DIR = '.cache/fragrantica-chrome';

const TITLE_SELECTOR = 'h1[itemprop="name"], h1';
const BRAND_SELECTOR = 'a[itemprop="url"], .brand a, .vendor a';
const RELEASE_YEAR_SELECTOR = 'time[itemprop="releaseDate"], time, .release';
const DESCRIPTION_SELECTOR = '[itemprop="description"]';
const ACCORD_BAR_SELECTOR = '.accord-bar';
const NOTE_PYRAMID_TOP_SELECTOR = '.notes .top';
const NOTE_PYRAMID_MID_SELECTOR = '.notes .middle';
const NOTE_PYRAMID_BASE_SELECTOR = '.notes .base';
const PERFUMER_SELECTOR = '.perfumer a, .namer a';

@Injectable()
export class FragranticaScraperService {
  private readonly logger = new Logger(FragranticaScraperService.name);
  private context: BrowserContext | null = null;

  async scrape(url: string): Promise<ScrapedPerfume> {
    const $ = await this.fetchAndParse(url);

    const accordBars = this.tryExtractAccordBars($);
    const notePyramid = this.tryExtractNotePyramid($);
    const perfumers = this.tryExtractPerfumers($);

    return {
      title: this.tryExtractText($, TITLE_SELECTOR),
      brand: this.tryExtractText($, BRAND_SELECTOR),
      releaseYear: this.tryExtractReleaseYear($, RELEASE_YEAR_SELECTOR),
      description: this.tryExtractText($, DESCRIPTION_SELECTOR),
      accordBars,
      notePyramid,
      perfumers,
      histograms: this.histograms.extract($),
    };
  }

  async close(): Promise<void> {
    if (this.context) {
      try {
        await this.context.close();
      } catch (err) {
        this.logger.warn(`Failed to close Playwright context: ${String(err)}`);
      } finally {
        this.context = null;
      }
    }
  }

  private async fetchAndParse(url: string): Promise<CheerioAPI> {
    const profileDir = process.env.FRAGRANTICA_CHROME_PROFILE_DIR ?? DEFAULT_PROFILE_DIR;
    const headless = process.env.FRAGRANTICA_HEADLESS === 'true';

    if (!this.context) {
      try {
        this.context = await chromium.launchPersistentContext(profileDir, {
          headless,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(
          `Failed to launch Playwright: ${message}. Run \`npx playwright install chromium\` if the browser binary is missing.`,
        );
      }
    }

    const page = await this.context.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      const html = await page.content();
      return cheerio.load(html);
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  private tryExtractText($: CheerioAPI, selector: string): string | null {
    const el = $(selector).first();
    if (el.length === 0) {
      return null;
    }
    const text = el.text().trim();
    return text || null;
  }

  private tryExtractReleaseYear($: CheerioAPI, selector: string): number | null {
    const el = $(selector).first();
    if (el.length === 0) {
      return null;
    }
    const raw = el.attr('datetime') ?? el.text().trim();
    const match = raw.match(/\b(19|20)\d{2}\b/);
    if (!match) {
      return null;
    }
    const year = Number.parseInt(match[0], 10);
    return Number.isFinite(year) ? year : null;
  }

  private tryExtractAccordBars($: CheerioAPI): AccordBar[] {
    const bars: AccordBar[] = [];
    $(ACCORD_BAR_SELECTOR).each((_idx, el) => {
      const $el = $(el);
      const label = $el.find('.label, .accord-name').text().trim();
      const style = $el.attr('style') ?? '';
      const widthMatch = style.match(/width:\s*([\d.]+)%/);
      const weightPct = widthMatch ? Number.parseFloat(widthMatch[1]) : 0;
      if (label) {
        bars.push({ label, weightPct, rawStyle: style });
      }
    });
    return bars;
  }

  private tryExtractNotePyramid($: CheerioAPI): NotePyramid {
    return {
      TOP: this.tryExtractNoteNames($, NOTE_PYRAMID_TOP_SELECTOR),
      HEART: this.tryExtractNoteNames($, NOTE_PYRAMID_MID_SELECTOR),
      BASE: this.tryExtractNoteNames($, NOTE_PYRAMID_BASE_SELECTOR),
    };
  }

  private tryExtractNoteNames($: CheerioAPI, selector: string): readonly string[] {
    const names: string[] = [];
    $(selector)
      .find('a, .note, span')
      .each((_idx, el) => {
        const txt = $(el).text().trim();
        if (txt && !names.includes(txt)) {
          names.push(txt);
        }
      });
    return names;
  }

  private tryExtractPerfumers($: CheerioAPI): ScrapedPerfumer[] {
    const perfumers: ScrapedPerfumer[] = [];
    $(PERFUMER_SELECTOR).each((_idx, el) => {
      const $el = $(el);
      const name = $el.text().trim();
      const bio = $el.attr('title') ?? null;
      if (name && !perfumers.some((p) => p.name === name)) {
        perfumers.push({ name, bio });
      }
    });
    return perfumers;
  }

  constructor(private readonly histograms: HistogramExtractorService) {}
}
