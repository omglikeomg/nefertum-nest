import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  Prisma,
  SubmissionStatus,
  AccordSource,
} from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../../../infrastructure/database/prisma/prisma.service';
import { CanonicalNote } from '../../../../../domain/catalog/perfume/entities/canonical-note.entity';
import {
  Perfume,
  isPyramidLevel,
} from '../../../../../domain/catalog/perfume/entities/perfume.aggregate';
import { ScaleHistogram, type ScaleMetric } from '../../../../../domain/catalog/perfume/value-objects/scale-histogram.vo';

import {
  ApproveSubmissionCommand,
  type ApproveSubmissionLayer,
} from './approve-submission.command';
import type {
  ApproveSubmissionResult,
  ResolvedPayload,
} from './approve-submission.types';

const HISTOGRAM_METRICS: ReadonlyArray<Exclude<ScaleMetric, 'VALUE'>> = [
  'GENDER',
  'LONGEVITY',
  'SILLAGE',
];

@CommandHandler(ApproveSubmissionCommand)
export class ApproveSubmissionHandler
  implements ICommandHandler<ApproveSubmissionCommand, ApproveSubmissionResult>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    command: ApproveSubmissionCommand,
  ): Promise<ApproveSubmissionResult> {
    const submission = await this.prisma.submissionQueue.findUnique({
      where: { id: command.submissionId },
    });

    if (!submission) {
      throw new NotFoundException(
        `Submission ${command.submissionId} not found`,
      );
    }

    if (submission.status !== SubmissionStatus.REQUIREMENTS_PASSED) {
      throw new Error(
        `Submission ${command.submissionId} is not ready for approval (status=${submission.status}).`,
      );
    }

    const payload = submission.resolvedPayload as unknown as ResolvedPayload;

    if (!payload) {
      throw new Error(
        `Submission ${command.submissionId} has no resolvedPayload.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const aggregate = Perfume.create({
        brandId: payload.brandId ?? '',
        collectionId: payload.collectionId ?? null,
        name: payload.name,
        description: payload.description ?? null,
        imageUrl: payload.imageUrl ?? null,
        storeUrl: payload.storeUrl ?? null,
        releaseYear: payload.releaseYear ?? null,
      });

      const slug = CanonicalNote.normalizeAlias(payload.name);

      const createdPerfume = await tx.perfume.create({
        data: {
          id: aggregate.id,
          brandId: aggregate.brandId,
          collectionId: aggregate.collectionId,
          name: aggregate.name,
          slug,
          description: aggregate.description,
          imageUrl: aggregate.imageUrl,
          storeUrl: aggregate.storeUrl,
          releaseYear: aggregate.releaseYear,
        },
      });

      let perfumeNotesCount = 0;
      let accordsCount = 0;
      let perfumersCount = 0;
      let histogramsCount = 0;

      if (command.layers.includes('catalog-min')) {
        for (const note of payload.notes) {
          if (!note.canonicalNoteId) {
            continue;
          }
          if (!isPyramidLevel(note.level)) {
            continue;
          }
          aggregate.addNoteToPyramid(note.canonicalNoteId, note.level);
          await tx.perfumeNote.create({
            data: {
              perfumeId: createdPerfume.id,
              noteId: note.canonicalNoteId,
              level: note.level,
              order: perfumeNotesCount,
            },
          });
          perfumeNotesCount += 1;
        }
      }

      if (command.layers.includes('catalog-mid')) {
        for (const accord of payload.accords) {
          if (!accord.accordId) {
            continue;
          }
          await tx.perfumeAccord.create({
            data: {
              perfumeId: createdPerfume.id,
              accordId: accord.accordId,
              source: AccordSource.MANUAL,
            },
          });
          accordsCount += 1;
        }

        for (const perfumer of payload.perfumers) {
          if (!perfumer.perfumerId) {
            continue;
          }
          await tx.perfumePerfumer.create({
            data: {
              perfumeId: createdPerfume.id,
              perfumerId: perfumer.perfumerId,
              role: 'PERFUMER',
            },
          });
          perfumersCount += 1;
        }
      }

      if (command.layers.includes('catalog-full')) {
        if (command.histograms) {
          for (const metric of HISTOGRAM_METRICS) {
            const bucketsForMetric = command.histograms[metric];
            if (!bucketsForMetric) {
              continue;
            }
            const validated = ScaleHistogram.fromPersistence(
              metric,
              bucketsForMetric,
            );
            if (validated.totalVotes === 0) {
              continue;
            }
            await tx.perfumeScaleHistogram.create({
              data: {
                perfumeId: createdPerfume.id,
                metric,
                buckets: validated.toJSON().buckets as Prisma.InputJsonValue,
                totalVotes: validated.totalVotes,
              },
            });
            histogramsCount += 1;
          }
        }

        if (command.perfumerBios) {
          for (const update of command.perfumerBios) {
            await tx.perfumer.update({
              where: { id: update.perfumerId },
              data: { bio: update.bio },
            });
          }
        }
      }

      await tx.submissionQueue.update({
        where: { id: command.submissionId },
        data: {
          status: SubmissionStatus.APPROVED,
          reviewedAt: new Date(),
          resolvedEntityId: createdPerfume.id,
        },
      });

      return {
        perfumeId: createdPerfume.id,
        submissionId: command.submissionId,
        status: 'APPROVED' as const,
        materialized: {
          perfume: true,
          perfumeNotes: perfumeNotesCount,
          accords: accordsCount,
          perfumers: perfumersCount,
          histograms: histogramsCount,
        },
      };
    });
  }
}
