import { Injectable } from '@nestjs/common';
import { AccordSource, Prisma, ScaleMetric } from '@prisma/client';

import { CanonicalNote } from '../../../../domain/catalog/perfume/entities/canonical-note.entity';
import {
  Perfume,
  isPyramidLevel,
  type PyramidLevel,
} from '../../../../domain/catalog/perfume/entities/perfume.aggregate';
import { ScaleHistogram } from '../../../../domain/catalog/perfume/value-objects/scale-histogram.vo';

import type {
  ApproveSubmissionOverrides,
  NoteAssignment,
  NoteMapping,
  ResolvedPayload,
} from '../commands/approve-submission/approve-submission.types';

export type CatalogLayer = 'catalog-min' | 'catalog-mid' | 'catalog-full';

export const HISTOGRAM_METRICS: ReadonlyArray<Exclude<ScaleMetric, 'VALUE'>> = [
  'GENDER',
  'LONGEVITY',
  'SILLAGE',
];

export interface MaterializationInput {
  submissionId: string;
  resolvedPayload: ResolvedPayload;
  approvedBy?: string | null;
  autoApproved?: boolean;
  overrides?: ApproveSubmissionOverrides;
  layers?: readonly CatalogLayer[];
}

export interface MaterializationResult {
  perfumeId: string;
  alreadyApproved: boolean;
}

@Injectable()
export class PerfumeMaterializationService {
  async materialize(
    input: MaterializationInput,
    tx: Prisma.TransactionClient,
  ): Promise<MaterializationResult> {
    const merged = mergePayloadWithOverrides(input.resolvedPayload, input.overrides);

    const layers: readonly CatalogLayer[] = input.layers ?? [
      'catalog-min',
      'catalog-mid',
      'catalog-full',
    ];

    const layersSet = new Set<CatalogLayer>(layers);

    if (!merged.brandId) {
      throw new Error('A valid brandId or resolvable brandName is required.');
    }

    const claim = await tx.perfumeSubmission.updateMany({
      where: {
        id: input.submissionId,
        status: { in: ['QUEUED', 'PROCESSING', 'NEEDS_REVIEW'] },
        materializedPerfumeId: null,
      },
      data: {
        status: 'PROCESSING',
        processedAt: new Date(),
        resolvedBrandId: merged.brandId,
        adminOverrides: input.overrides
          ? (JSON.parse(JSON.stringify(input.overrides)) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });

    if (claim.count === 0) {
      const existing = await tx.perfumeSubmission.findUnique({
        where: { id: input.submissionId },
        select: { materializedPerfumeId: true },
      });

      if (existing?.materializedPerfumeId) {
        return {
          perfumeId: existing.materializedPerfumeId,
          alreadyApproved: true,
        };
      }

      throw new Error(`Submission ${input.submissionId} could not be claimed for approval.`);
    }

    const aggregate = Perfume.create({
      brandId: merged.brandId,
      collectionId: merged.collectionId ?? null,
      name: merged.name,
      description: merged.description ?? null,
      imageUrl: merged.imageUrl ?? null,
      storeUrl: merged.storeUrl ?? null,
      releaseYear: merged.releaseYear ?? null,
    });

    const slug = CanonicalNote.normalizeAlias(merged.name);

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

    if (layersSet.has('catalog-min')) {
      const noteAssignments = resolveNoteAssignments(
        merged.notes,
        input.overrides?.noteAssignments,
      );

      for (const assignment of noteAssignments) {
        aggregate.addNoteToPyramid(assignment.canonicalNoteId, assignment.level);
        await tx.perfumeNote.create({
          data: {
            perfumeId: createdPerfume.id,
            noteId: assignment.canonicalNoteId,
            level: assignment.level,
            order: 0,
          },
        });
      }
    }

    if (layersSet.has('catalog-mid')) {
      for (const accord of merged.accords) {
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
      }

      const perfumerIds = input.overrides?.perfumerIds ?? merged.perfumers.map((p) => p.perfumerId);

      for (const perfumerId of perfumerIds) {
        if (!perfumerId) {
          continue;
        }
        await tx.perfumePerfumer.create({
          data: {
            perfumeId: createdPerfume.id,
            perfumerId,
            role: 'PERFUMER',
          },
        });
      }
    }

    if (layersSet.has('catalog-full')) {
      for (const metric of HISTOGRAM_METRICS) {
        const histogram = ScaleHistogram.empty(metric);
        await tx.perfumeScaleHistogram.create({
          data: {
            perfumeId: createdPerfume.id,
            metric,
            buckets: histogram.toJSON().buckets as Prisma.InputJsonValue,
            totalVotes: 0,
          },
        });
      }
    }

    await tx.perfumeSubmission.update({
      where: { id: input.submissionId },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedById: input.approvedBy ?? null,
        materializedPerfumeId: createdPerfume.id,
      },
    });

    return {
      perfumeId: createdPerfume.id,
      alreadyApproved: false,
    };
  }
}

function mergePayloadWithOverrides(
  payload: ResolvedPayload,
  overrides?: ApproveSubmissionOverrides,
): ResolvedPayload {
  if (!overrides) {
    return payload;
  }

  const brandId = overrides.brandId ?? payload.brandId;
  const brandName = overrides.brandName;
  void brandName;

  return {
    ...payload,
    brandId: brandId ?? null,
    collectionId:
      overrides.collectionId !== undefined ? overrides.collectionId : payload.collectionId,
    name: overrides.name ?? payload.name,
    description: overrides.description !== undefined ? overrides.description : payload.description,
    imageUrl: overrides.imageUrl !== undefined ? overrides.imageUrl : payload.imageUrl,
    storeUrl: overrides.storeUrl !== undefined ? overrides.storeUrl : payload.storeUrl,
    releaseYear: overrides.releaseYear !== undefined ? overrides.releaseYear : payload.releaseYear,
    notes: applyNoteOverrides(payload.notes, overrides.noteMappings),
    accords: payload.accords,
    perfumers: payload.perfumers,
  };
}

function applyNoteOverrides(
  payloadNotes: ResolvedPayload['notes'],
  mappings?: NoteMapping[],
): ResolvedPayload['notes'] {
  if (!mappings || mappings.length === 0) {
    return payloadNotes;
  }

  const mappingByRawName = new Map<string, NoteMapping>();
  for (const mapping of mappings) {
    if (mapping.rawName) {
      mappingByRawName.set(CanonicalNote.normalizeAlias(mapping.rawName), mapping);
    }
  }

  return payloadNotes.map((note) => {
    const mapping = mappingByRawName.get(CanonicalNote.normalizeAlias(note.rawName));
    if (!mapping) {
      return note;
    }

    return {
      ...note,
      canonicalNoteId: mapping.canonicalNoteId,
      level: mapping.level ?? note.level,
    };
  });
}

function resolveNoteAssignments(
  payloadNotes: ResolvedPayload['notes'],
  overrideAssignments?: NoteAssignment[],
): NoteAssignment[] {
  if (overrideAssignments && overrideAssignments.length > 0) {
    return overrideAssignments.filter((a) => isPyramidLevel(a.level));
  }

  return payloadNotes
    .filter(
      (n): n is { rawName: string; level: PyramidLevel; canonicalNoteId: string } =>
        n.canonicalNoteId !== null && isPyramidLevel(n.level),
    )
    .map((n) => ({
      canonicalNoteId: n.canonicalNoteId,
      level: n.level,
    }));
}
