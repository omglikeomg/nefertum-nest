import * as path from 'node:path';

export async function parseFixtureUrls(fixturePath: string): Promise<string[]> {
  const fs = await import('node:fs/promises');
  const absolutePath = path.isAbsolute(fixturePath)
    ? fixturePath
    : path.resolve(process.cwd(), fixturePath);
  const raw = await fs.readFile(absolutePath, 'utf8');
  const urls: string[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    if (!/^https?:\/\//.test(trimmed)) {
      console.warn(`Skipping non-URL line in fixture: ${trimmed}`);
      continue;
    }
    urls.push(trimmed);
  }
  return urls;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface SeedUrlContext {
  url: string;
  index: number;
  total: number;
}

export async function iterateUrls(args: {
  urls: readonly string[];
  delayMs: number;
  onUrl: (url: string, ctx: SeedUrlContext) => Promise<void>;
  onLog?: (line: string) => void;
}): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;
  for (let i = 0; i < args.urls.length; i += 1) {
    const url = args.urls[i];
    const ctx: SeedUrlContext = { url, index: i + 1, total: args.urls.length };
    try {
      await args.onUrl(url, ctx);
      succeeded += 1;
    } catch (err) {
      failed += 1;
      args.onLog?.(
        `[${ctx.index}/${ctx.total}] FAILED ${url}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (args.delayMs > 0 && i < args.urls.length - 1) {
      await sleep(args.delayMs);
    }
  }
  return { succeeded, failed };
}
