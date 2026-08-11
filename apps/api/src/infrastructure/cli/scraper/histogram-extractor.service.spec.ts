import * as cheerio from 'cheerio';

import { HistogramExtractorService } from './histogram-extractor.service';

describe('HistogramExtractorService', () => {
  it('extracts vote counts from title attributes per metric', () => {
    const html = `<div id="gender-votes" title="3 votes"></div>
                  <div id="longevity-votes" title="10 votes"></div>
                  <div id="sillage-votes" title="7 votes"></div>`;
    const $ = cheerio.load(html);
    const result = new HistogramExtractorService().extract($);

    expect(result.GENDER).toEqual({ 0: 3, 1: 0, 2: 0, 3: 0, 4: 0 });
    expect(result.LONGEVITY).toEqual({ 0: 10, 1: 0, 2: 0, 3: 0, 4: 0 });
    expect(result.SILLAGE).toEqual({ 0: 7, 1: 0, 2: 0, 3: 0, 4: 0 });
    expect(result.VALUE).toEqual({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 });
  });

  it('VALUE is always all zeros (R9 invariant)', () => {
    const html = `<div id="gender-votes" title="100 votes"></div>`;
    const $ = cheerio.load(html);
    const result = new HistogramExtractorService().extract($);

    expect(result.VALUE).toEqual({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 });
  });

  it('returns all-zero buckets when no metric containers are present', () => {
    const $ = cheerio.load('<html><body></body></html>');
    const result = new HistogramExtractorService().extract($);

    expect(result.GENDER).toEqual({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 });
    expect(result.LONGEVITY).toEqual({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 });
    expect(result.SILLAGE).toEqual({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 });
    expect(result.VALUE).toEqual({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 });
  });

  it('handles non-numeric title attributes gracefully (all zeros)', () => {
    const html = `<div id="gender-votes" title="(no votes yet)"></div>`;
    const $ = cheerio.load(html);
    const result = new HistogramExtractorService().extract($);

    expect(result.GENDER).toEqual({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 });
  });
});
