import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { CanonicalNote } from '../../../domain/catalog/perfume/entities/canonical-note.entity';
import type { ResolverTx } from './canonical-note-resolver.service';

export interface BrandResolution {
  brandId: string;
  created: boolean;
}

@Injectable()
export class BrandResolverService {
  async resolve(
    name: string,
    tx: ResolverTx,
  ): Promise<BrandResolution | null> {
    const trimmed = name.trim();
    if (!trimmed) {
      return null;
    }

    const slug = CanonicalNote.normalizeAlias(trimmed);
    if (!slug) {
      return null;
    }

    const existing = await tx.brand.findUnique({
      where: { slug },
    });

    if (existing) {
      return { brandId: existing.id, created: false };
    }

    const created = await tx.brand.create({
      data: {
        name: trimmed,
        slug,
      },
    });

    return { brandId: created.id, created: true };
  }
}
