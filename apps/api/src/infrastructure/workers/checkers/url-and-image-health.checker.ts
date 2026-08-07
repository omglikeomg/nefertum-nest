import { Injectable } from '@nestjs/common';

import {
  CheckerStatus,
  PerfumeSubmissionPayload,
  UrlAndImageHealthCheckerResult,
} from '../../../application/submissions/submission.types';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '0.0.0.0',
  '::1',
  '[::1]',
  'metadata.google.internal',
]);

const BLOCKED_IPV4_RANGES: Array<{ start: number; end: number }> = [
  { start: ipToInt('127.0.0.0'), end: ipToInt('127.255.255.255') },
  { start: ipToInt('10.0.0.0'), end: ipToInt('10.255.255.255') },
  { start: ipToInt('172.16.0.0'), end: ipToInt('172.31.255.255') },
  { start: ipToInt('192.168.0.0'), end: ipToInt('192.168.255.255') },
  { start: ipToInt('169.254.0.0'), end: ipToInt('169.254.255.255') },
];

function ipToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

export function isSsrfRoutable(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return true;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return true;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return true;
  }

  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const ip = ipToInt(hostname);
    return BLOCKED_IPV4_RANGES.some((range) => ip >= range.start && ip <= range.end);
  }

  return false;
}

@Injectable()
export class UrlAndImageHealthChecker {
  async check(payload: PerfumeSubmissionPayload): Promise<UrlAndImageHealthCheckerResult> {
    const errors: string[] = [];
    let storeUrlOk = false;
    let imageUrlOk = false;
    let imageContentType: string | undefined;

    if (payload.storeUrl) {
      if (isSsrfRoutable(payload.storeUrl)) {
        errors.push('storeUrl targets a blocked (SSRF) address.');
      } else {
        try {
          const response = await fetch(payload.storeUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000),
          });
          storeUrlOk = response.ok;
          if (!response.ok) {
            errors.push(`storeUrl HEAD returned ${response.status}.`);
          }
        } catch (err) {
          errors.push(`storeUrl fetch failed: ${(err as Error).message ?? 'unknown error'}`);
        }
      }
    }

    if (payload.imageUrl) {
      if (isSsrfRoutable(payload.imageUrl)) {
        errors.push('imageUrl targets a blocked (SSRF) address.');
      } else {
        try {
          const response = await fetch(payload.imageUrl, {
            method: 'GET',
            headers: { Range: 'bytes=0-0' },
            signal: AbortSignal.timeout(5000),
          });
          if (response.ok || response.status === 206) {
            imageUrlOk = true;
            imageContentType = response.headers.get('content-type') ?? undefined;
          } else {
            errors.push(`imageUrl GET returned ${response.status}.`);
          }
        } catch (err) {
          errors.push(`imageUrl fetch failed: ${(err as Error).message ?? 'unknown error'}`);
        }
      }
    }

    let status: CheckerStatus;
    if (errors.length === 0 && storeUrlOk && imageUrlOk) {
      status = CheckerStatus.PASS;
    } else if ((storeUrlOk || imageUrlOk) && errors.length === 0) {
      status = CheckerStatus.WARN;
    } else if (storeUrlOk || imageUrlOk) {
      status = CheckerStatus.WARN;
    } else if (errors.length > 0) {
      status = CheckerStatus.FAIL;
    } else {
      status = CheckerStatus.WARN;
    }

    return {
      status,
      storeUrlOk,
      imageUrlOk,
      imageContentType,
      errors,
    };
  }
}
