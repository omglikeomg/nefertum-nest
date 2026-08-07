import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CanonicalNote } from '../../../../domain/catalog/perfume/entities/canonical-note.entity';
import type { ResolvedPerfumerRef } from '../commands/submit-new-perfume/submit-new-perfume.types';

export interface PerfumerResolution {
  resolved: readonly ResolvedPerfumerRef[];
  unresolved: readonly string[];
}

@Injectable()
export class PerfumerResolutionService {
  async resolve(
    tx: Prisma.TransactionClient,
    rawNames: readonly string[],
  ): Promise<PerfumerResolution> {
    const uniqueRawNames = [...new Set(rawNames.map((name) => name.trim()).filter(Boolean))];

    if (uniqueRawNames.length === 0) {
      return { resolved: [], unresolved: [] };
    }

    const perfumerRows = await tx.perfumer.findMany({
      where: {
        name: {
          in: uniqueRawNames,
          mode: 'insensitive',
        },
      },
    });

    const resolved: ResolvedPerfumerRef[] = [];
    const unresolved: string[] = [];

    for (const rawName of uniqueRawNames) {
      const normalizedRaw = CanonicalNote.normalizeAlias(rawName);

      const perfumer = perfumerRows.find(
        (row) => CanonicalNote.normalizeAlias(row.name) === normalizedRaw,
      );

      if (perfumer) {
        resolved.push({
          rawName,
          perfumerId: perfumer.id,
          perfumerName: perfumer.name,
        });
      } else {
        unresolved.push(rawName);
      }
    }

    return { resolved, unresolved };
  }
}
