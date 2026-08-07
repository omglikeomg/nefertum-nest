import {
  CheckerStatus,
  PerfumeSubmissionPayload,
} from '../../../application/submissions/submission.types';
import { UrlAndImageHealthChecker, isSsrfRoutable } from './url-and-image-health.checker';

describe('isSsrfRoutable', () => {
  it.each([
    ['http://localhost/foo'],
    ['http://127.0.0.1/foo'],
    ['http://127.1.2.3/foo'],
    ['http://10.0.0.1/foo'],
    ['http://10.255.255.255/foo'],
    ['http://172.16.0.1/foo'],
    ['http://172.31.255.255/foo'],
    ['http://192.168.0.1/foo'],
    ['http://192.168.255.255/foo'],
    ['http://169.254.169.254/latest/meta-data/'],
    ['file:///etc/passwd'],
    ['gopher://example.com/_foo'],
  ])('blocks %s', (url) => {
    expect(isSsrfRoutable(url)).toBe(true);
  });

  it.each([
    ['https://example.com/foo'],
    ['https://api.fragrantica.com/perfume/123'],
    ['https://images.fragrantica.com/perfume.jpg'],
  ])('allows %s', (url) => {
    expect(isSsrfRoutable(url)).toBe(false);
  });
});

describe('UrlAndImageHealthChecker', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns FAIL with SSRF error when storeUrl is blocked', async () => {
    const checker = new UrlAndImageHealthChecker();

    const result = await checker.check({
      name: 'X',
      storeUrl: 'http://localhost/x',
    } as PerfumeSubmissionPayload);

    expect(result.status).toBe(CheckerStatus.FAIL);
    expect(result.storeUrlOk).toBe(false);
    expect(result.errors[0]).toMatch(/SSRF/);
  });

  it('returns PASS when both URLs respond OK', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 206,
        headers: new Map([['content-type', 'image/jpeg']]),
      });

    const checker = new UrlAndImageHealthChecker();
    const result = await checker.check({
      name: 'X',
      storeUrl: 'https://example.com/perfume',
      imageUrl: 'https://example.com/perfume.jpg',
    } as PerfumeSubmissionPayload);

    expect(result.status).toBe(CheckerStatus.PASS);
    expect(result.storeUrlOk).toBe(true);
    expect(result.imageUrlOk).toBe(true);
    expect(result.imageContentType).toBe('image/jpeg');
  });

  it('returns WARN when only one URL is reachable', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Map() })
      .mockRejectedValueOnce(new Error('timeout'));

    const checker = new UrlAndImageHealthChecker();
    const result = await checker.check({
      name: 'X',
      storeUrl: 'https://example.com/x',
      imageUrl: 'https://example.com/x.jpg',
    } as PerfumeSubmissionPayload);

    expect(result.status).toBe(CheckerStatus.WARN);
    expect(result.storeUrlOk).toBe(true);
    expect(result.imageUrlOk).toBe(false);
  });

  it('returns WARN when no URLs are provided', async () => {
    const checker = new UrlAndImageHealthChecker();
    const result = await checker.check({
      name: 'X',
    } as PerfumeSubmissionPayload);

    expect(result.status).toBe(CheckerStatus.WARN);
    expect(result.storeUrlOk).toBe(false);
    expect(result.imageUrlOk).toBe(false);
    expect(result.errors).toEqual([]);
  });
});
