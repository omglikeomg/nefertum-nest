import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { CanonicalNote } from '../../../domain/catalog/perfume/entities/canonical-note.entity';
import {
  CheckerStatus,
  DuplicateSignatureCheckerResult,
  PerfumeSubmissionPayload,
} from '../../../application/submissions/submission.types';

const SIMILARITY_WARN_THRESHOLD = 0.8;
const SIMILARITY_FAIL_THRESHOLD = 0.92;

function computeSignature(brandName: string | undefined, name: string): string {
  const b = CanonicalNote.normalizeAlias(brandName ?? '');
  const n = CanonicalNote.normalizeAlias(name);
  return `${b}::${n}`;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const curr: number[] = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr.push(Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost));
    }
    for (let k = 0; k < prev.length; k++) {
      prev[k] = curr[k];
    }
  }
  return prev[b.length];
}

export function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  const distance = levenshtein(a, b);
  return 1 - distance / max;
}

@Injectable()
export class DuplicateSignatureChecker {
  constructor(private readonly prisma: PrismaService) {}

  async check(
    tx: Prisma.TransactionClient,
    payload: PerfumeSubmissionPayload,
    resolvedBrandId: string | null,
  ): Promise<DuplicateSignatureCheckerResult> {
    const signature = computeSignature(payload.brandName, payload.name);

    const candidates = await this.fetchCandidates(tx, payload, resolvedBrandId);

    const target = CanonicalNote.normalizeAlias(payload.name);
    const similarPerfumes = candidates
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        similarity: similarity(CanonicalNote.normalizeAlias(c.name), target),
      }))
      .filter((c) => c.similarity >= SIMILARITY_WARN_THRESHOLD)
      .sort((a, b) => b.similarity - a.similarity);

    const maxSimilarity = similarPerfumes[0]?.similarity ?? 0;
    const exactDuplicate = similarPerfumes.some((c) => c.similarity >= 0.999);

    let status: CheckerStatus;
    if (exactDuplicate || maxSimilarity >= SIMILARITY_FAIL_THRESHOLD) {
      status = CheckerStatus.FAIL;
    } else if (maxSimilarity >= SIMILARITY_WARN_THRESHOLD) {
      status = CheckerStatus.WARN;
    } else {
      status = CheckerStatus.PASS;
    }

    return {
      status,
      signature,
      exactDuplicate,
      maxSimilarity,
      similarPerfumes: similarPerfumes.slice(0, 10),
    };
  }

  private async fetchCandidates(
    tx: Prisma.TransactionClient,
    payload: PerfumeSubmissionPayload,
    resolvedBrandId: string | null,
  ): Promise<Array<{ id: string; name: string; slug: string }>> {
    if (resolvedBrandId) {
      return tx.perfume.findMany({
        where: { brandId: resolvedBrandId },
        select: { id: true, name: true, slug: true },
        take: 50,
      });
    }

    const target = CanonicalNote.normalizeAlias(payload.name);
    if (!target) {
      return [];
    }

    const tokens: string[] = target.split(' ').filter((t: string) => t.length >= 3);
    if (tokens.length === 0) {
      return [];
    }

    return tx.perfume.findMany({
      where: {
        name: { contains: tokens[0], mode: 'insensitive' },
      },
      select: { id: true, name: true, slug: true },
      take: 50,
    });
  }
}
