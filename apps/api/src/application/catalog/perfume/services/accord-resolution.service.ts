import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CanonicalNote } from '../../../../domain/catalog/perfume/entities/canonical-note.entity';
import type { ResolvedAccordRef } from '../commands/submit-new-perfume/submit-new-perfume.types';

export interface AccordResolution {
  resolved: readonly ResolvedAccordRef[];
  unresolved: readonly string[];
}

@Injectable()
export class AccordResolutionService {
  async resolve(
    tx: Prisma.TransactionClient,
    rawNames: readonly string[],
  ): Promise<AccordResolution> {
    const uniqueRawNames = [...new Set(rawNames.map((name) => name.trim()).filter(Boolean))];

    if (uniqueRawNames.length === 0) {
      return { resolved: [], unresolved: [] };
    }

    const accordRows = await tx.accord.findMany({
      where: {
        name: {
          in: uniqueRawNames,
          mode: 'insensitive',
        },
      },
    });

    const resolved: ResolvedAccordRef[] = [];
    const unresolved: string[] = [];

    for (const rawName of uniqueRawNames) {
      const normalizedRaw = CanonicalNote.normalizeAlias(rawName);

      const accord = accordRows.find(
        (row) => CanonicalNote.normalizeAlias(row.name) === normalizedRaw,
      );

      if (accord) {
        resolved.push({
          rawName,
          accordId: accord.id,
          accordName: accord.name,
        });
      } else {
        unresolved.push(rawName);
      }
    }

    return { resolved, unresolved };
  }
}
