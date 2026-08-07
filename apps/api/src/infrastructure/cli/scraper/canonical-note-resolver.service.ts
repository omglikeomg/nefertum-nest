import { Injectable, Logger } from '@nestjs/common';
import { get as levenshteinDistance } from 'fast-levenshtein';
import type { Prisma, PrismaClient } from '@prisma/client';

import { CanonicalNote } from '../../../domain/catalog/perfume/entities/canonical-note.entity';

export type ResolverTx = PrismaClient | Prisma.TransactionClient;

export interface CanonicalNoteResolution {
  noteId: string;
  createdAlias: boolean;
}

const LEVENSHTEIN_AUTO_ALIAS_THRESHOLD = 2;

@Injectable()
export class CanonicalNoteResolverService {
  private readonly logger = new Logger(CanonicalNoteResolverService.name);

  async resolve(
    rawName: string,
    tx: ResolverTx,
  ): Promise<CanonicalNoteResolution | null> {
    const normalized = CanonicalNote.normalizeAlias(rawName);

    if (!normalized) {
      return null;
    }

    const tier12 = await tx.note.findFirst({
      where: {
        OR: [
          { canonicalName: { equals: rawName, mode: 'insensitive' } },
          { aliases: { some: { normalizedAlias: normalized } } },
        ],
      },
      include: { aliases: true },
    });

    if (tier12) {
      return { noteId: tier12.id, createdAlias: false };
    }

    const allNotes = await tx.note.findMany({
      select: { id: true, canonicalName: true },
    });

    const tier3Candidates = allNotes
      .map((note) => ({
        note,
        distance: levenshteinDistance(rawName, note.canonicalName),
      }))
      .filter((entry) => entry.distance > 0 && entry.distance <= LEVENSHTEIN_AUTO_ALIAS_THRESHOLD)
      .sort((a, b) => a.distance - b.distance);

    if (tier3Candidates.length > 0) {
      const closest = tier3Candidates[0];
      await tx.noteAlias.create({
        data: {
          noteId: closest.note.id,
          alias: rawName,
          normalizedAlias: normalized,
        },
      });
      this.logger.warn(
        `Levenshtein auto-alias: "${rawName}" -> "${closest.note.canonicalName}" (distance=${closest.distance})`,
      );
      return { noteId: closest.note.id, createdAlias: true };
    }

    const created = await tx.note.create({
      data: {
        canonicalName: rawName,
        slug: normalized,
        aliases: {
          create: [{ alias: rawName, normalizedAlias: normalized }],
        },
      },
    });

    return { noteId: created.id, createdAlias: false };
  }
}
