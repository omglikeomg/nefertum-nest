import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CanonicalNote } from '../../../../domain/catalog/perfume/entities/canonical-note.entity';
import type { ResolvedNoteRef } from '../commands/submit-new-perfume/submit-new-perfume.types';

export interface NoteTaxonomyResolution {
  resolved: readonly ResolvedNoteRef[];
  unresolved: readonly string[];
}

@Injectable()
export class NoteTaxonomyService {
  async resolve(
    tx: Prisma.TransactionClient,
    rawNames: readonly string[],
  ): Promise<NoteTaxonomyResolution> {
    const uniqueRawNames = [...new Set(rawNames.map((name) => name.trim()).filter(Boolean))];

    if (uniqueRawNames.length === 0) {
      return { resolved: [], unresolved: [] };
    }

    const normalizedAliases = uniqueRawNames.map((rawName) =>
      CanonicalNote.normalizeAlias(rawName),
    );

    const noteRows = await tx.note.findMany({
      where: {
        OR: [
          {
            canonicalName: {
              in: uniqueRawNames,
              mode: 'insensitive',
            },
          },
          {
            aliases: {
              some: {
                normalizedAlias: {
                  in: normalizedAliases,
                },
              },
            },
          },
        ],
      },
      include: {
        aliases: true,
      },
    });

    const candidates = noteRows.map((row) =>
      CanonicalNote.create({
        id: row.id,
        canonicalName: row.canonicalName,
        aliases: row.aliases.map((alias) => alias.alias),
        description: row.description ?? undefined,
      }),
    );

    const resolved: ResolvedNoteRef[] = [];
    const unresolved: string[] = [];

    for (const rawName of uniqueRawNames) {
      const canonicalNote = CanonicalNote.resolve(rawName, candidates);

      if (canonicalNote) {
        resolved.push({
          rawName,
          canonicalNoteId: canonicalNote.id,
          canonicalName: canonicalNote.canonicalName,
        });
      } else {
        unresolved.push(rawName);
      }
    }

    return { resolved, unresolved };
  }
}
