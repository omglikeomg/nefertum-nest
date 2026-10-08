import { BadRequestException } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../../infrastructure/database/prisma/prisma.service';
import {
  SCALE_BUCKET_DEFINITIONS,
  ScaleHistogram,
} from '../../../../../domain/catalog/perfume/value-objects/scale-histogram.vo';

import { toNotePyramid } from '../shared/note-pyramid.mapper';
import { GetPerfumesForComparisonQuery } from './get-perfumes-for-comparison.query';
import {
  COMPARISON_METRICS,
  ComparisonMetric,
  MAX_COMPARISON_IDS,
  PerfumeComparisonItem,
  PerfumeComparisonScaleHistogram,
} from './get-perfumes-for-comparison.types';

const perfumeComparisonInclude = {
  brand: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  notes: {
    orderBy: {
      order: 'asc',
    },
    include: {
      note: {
        select: {
          id: true,
          canonicalName: true,
          slug: true,
        },
      },
    },
  },
  scaleHistograms: {
    where: {
      metric: { in: [...COMPARISON_METRICS] },
    },
  },
} satisfies Prisma.PerfumeInclude;

type PerfumeComparisonRow = Prisma.PerfumeGetPayload<{
  include: typeof perfumeComparisonInclude;
}>;

@QueryHandler(GetPerfumesForComparisonQuery)
export class GetPerfumesForComparisonQueryHandler
  implements IQueryHandler<GetPerfumesForComparisonQuery, PerfumeComparisonItem[]>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetPerfumesForComparisonQuery,
  ): Promise<PerfumeComparisonItem[]> {
    if (query.perfumeIds.length > MAX_COMPARISON_IDS) {
      throw new BadRequestException(
        `At most ${MAX_COMPARISON_IDS} perfume IDs can be compared at once.`,
      );
    }

    const unique = [...new Set(query.perfumeIds)];
    if (unique.length === 0) {
      return [];
    }

    const rows = await this.prisma.perfume.findMany({
      where: { id: { in: unique } },
      include: perfumeComparisonInclude,
    });

    const rowsById = new Map(rows.map((row) => [row.id, row]));
    const items: PerfumeComparisonItem[] = [];
    for (const id of unique) {
      const row = rowsById.get(id);
      if (row) {
        items.push(this.mapToItem(row));
      }
    }
    return items;
  }

  private mapToItem(row: PerfumeComparisonRow): PerfumeComparisonItem {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      brand: row.brand,
      notes: toNotePyramid(row.notes),
      scaleHistograms: COMPARISON_METRICS.map((metric) =>
        this.toHistogram(metric, row),
      ),
    };
  }

  private toHistogram(
    metric: ComparisonMetric,
    row: PerfumeComparisonRow,
  ): PerfumeComparisonScaleHistogram {
    const stored = row.scaleHistograms.find((h) => h.metric === metric);
    const histogram = stored
      ? ScaleHistogram.fromPersistence(metric, stored.buckets, stored.totalVotes)
      : ScaleHistogram.empty(metric);

    return {
      metric,
      buckets: SCALE_BUCKET_DEFINITIONS[metric].map(
        (definition) => histogram.buckets[definition.code],
      ),
      totalVotes: histogram.totalVotes,
    };
  }
}
