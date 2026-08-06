import { NotFoundException } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import {
  Prisma,
  RelationType,
  ReviewStatus,
} from '@prisma/client';

import { PrismaService } from '../../../../../infrastructure/database/prisma/prisma.service';
import {
  ScaleHistogram,
  ScaleMetric,
} from '../../../../../domain/catalog/perfume/value-objects/scale-histogram.vo';

import { GetPerfumeDetailsQuery } from './get-perfume-details.query';
import {
  PerfumeDetailsAccord,
  PerfumeDetailsNote,
  PerfumeDetailsNotePyramid,
  PerfumeDetailsRelation,
  PerfumeDetailsResult,
  PerfumeDetailsReview,
} from './get-perfume-details.types';

const perfumeDetailsInclude = {
  brand: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  collection: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  perfumers: {
    select: {
      role: true,
      perfumer: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
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
  accords: {
    select: {
      source: true,
      weight: true,
      accord: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },
  scaleHistograms: true,
  relationsFrom: {
    where: {
      type: {
        in: [RelationType.REMINDS_ME_OF, RelationType.ALSO_LIKES],
      },
    },
    orderBy: {
      score: 'desc',
    },
    take: 20,
    select: {
      type: true,
      upvotes: true,
      downvotes: true,
      score: true,
      targetPerfume: {
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
        },
      },
    },
  },
  reviews: {
    where: {
      status: ReviewStatus.PUBLISHED,
    },
    orderBy: [
      {
        score: 'desc',
      },
      {
        createdAt: 'desc',
      },
    ],
    take: 5,
    select: {
      id: true,
      title: true,
      content: true,
      score: true,
      createdAt: true,
      user: {
        select: {
          username: true,
        },
      },
    },
  },
} satisfies Prisma.PerfumeInclude;

type PerfumeDetailsRow = Prisma.PerfumeGetPayload<{
  include: typeof perfumeDetailsInclude;
}>;

@QueryHandler(GetPerfumeDetailsQuery)
export class GetPerfumeDetailsQueryHandler
  implements IQueryHandler<GetPerfumeDetailsQuery, PerfumeDetailsResult>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetPerfumeDetailsQuery,
  ): Promise<PerfumeDetailsResult> {
    const perfume = await this.prisma.perfume.findUnique({
      where: {
        id: query.perfumeId,
      },
      include: perfumeDetailsInclude,
    });

    if (!perfume) {
      throw new NotFoundException(
        `Perfume with id ${query.perfumeId} was not found.`,
      );
    }

    return this.mapToDetails(perfume);
  }

  private mapToDetails(perfume: PerfumeDetailsRow): PerfumeDetailsResult {
    const notes: PerfumeDetailsNotePyramid = {
      top: [],
      heart: [],
      base: [],
    };

    for (const assignment of perfume.notes) {
      const note: PerfumeDetailsNote = {
        noteId: assignment.note.id,
        canonicalName: assignment.note.canonicalName,
        slug: assignment.note.slug,
        order: assignment.order,
      };

      if (assignment.level === 'TOP') {
        notes.top.push(note);
      }

      if (assignment.level === 'HEART') {
        notes.heart.push(note);
      }

      if (assignment.level === 'BASE') {
        notes.base.push(note);
      }
    }

    const remindsMeOf: PerfumeDetailsRelation[] = [];
    const peopleAlsoLike: PerfumeDetailsRelation[] = [];

    for (const relation of perfume.relationsFrom) {
      const relationItem: PerfumeDetailsRelation = {
        perfumeId: relation.targetPerfume.id,
        name: relation.targetPerfume.name,
        slug: relation.targetPerfume.slug,
        imageUrl: relation.targetPerfume.imageUrl,
        score: relation.score,
        upvotes: relation.upvotes,
        downvotes: relation.downvotes,
      };

      if (relation.type === RelationType.REMINDS_ME_OF) {
        remindsMeOf.push(relationItem);
      } else {
        peopleAlsoLike.push(relationItem);
      }
    }

    const scaleHistograms = perfume.scaleHistograms.map((histogram) =>
      ScaleHistogram.fromPersistence(
        histogram.metric as ScaleMetric,
        histogram.buckets,
        histogram.totalVotes,
      ).toJSON(),
    );

    const accords: PerfumeDetailsAccord[] = perfume.accords.map(
      (perfumeAccord) => ({
        id: perfumeAccord.accord.id,
        name: perfumeAccord.accord.name,
        slug: perfumeAccord.accord.slug,
        source: perfumeAccord.source,
        weight: perfumeAccord.weight,
      }),
    );

    const latestReviews: PerfumeDetailsReview[] = perfume.reviews.map(
      (review) => ({
        id: review.id,
        title: review.title,
        content: review.content,
        authorUsername: review.user.username,
        score: review.score,
        createdAt: review.createdAt,
      }),
    );

    return {
      id: perfume.id,
      brand: perfume.brand,
      collection: perfume.collection
        ? {
            id: perfume.collection.id,
            name: perfume.collection.name,
            slug: perfume.collection.slug,
          }
        : null,
      name: perfume.name,
      slug: perfume.slug,
      description: perfume.description,
      imageUrl: perfume.imageUrl,
      storeUrl: perfume.storeUrl,
      releaseYear: perfume.releaseYear,
      discontinued: perfume.discontinued,
      discontinuationNotes: perfume.discontinuationNotes,
      perfumers: perfume.perfumers.map((perfumePerfumer) => ({
        id: perfumePerfumer.perfumer.id,
        name: perfumePerfumer.perfumer.name,
        slug: perfumePerfumer.perfumer.slug,
        role: perfumePerfumer.role,
      })),
      notes,
      accords,
      scaleHistograms,
      remindsMeOf,
      peopleAlsoLike,
      latestReviews,
    };
  }
}
