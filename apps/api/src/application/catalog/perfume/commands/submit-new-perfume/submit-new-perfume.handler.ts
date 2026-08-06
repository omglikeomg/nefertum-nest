import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  Prisma,
  SubmissionEntityType,
  SubmissionStatus,
} from '@prisma/client';

import { PrismaService } from '../../../../../infrastructure/database/prisma/prisma.service';
import { CanonicalNote } from '../../../../../domain/catalog/perfume/entities/canonical-note.entity';
import { isPyramidLevel } from '../../../../../domain/catalog/perfume/entities/perfume.aggregate';

import { SubmitNewPerfumeCommand } from './submit-new-perfume.command';
import {
  ResolvedAccordRef,
  ResolvedNoteRef,
  ResolvedPerfumerRef,
  SubmitNewPerfumeInput,
  SubmitNewPerfumeResult,
} from './submit-new-perfume.types';

@CommandHandler(SubmitNewPerfumeCommand)
export class SubmitNewPerfumeHandler
  implements ICommandHandler<SubmitNewPerfumeCommand, SubmitNewPerfumeResult>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    command: SubmitNewPerfumeCommand,
  ): Promise<SubmitNewPerfumeResult> {
    const { input } = command;

    this.validate(input);

    const missingRequirements = this.collectMissingRequirements(input);

    return this.prisma.$transaction(async (tx) => {
      const pendingSubmission = await tx.submissionQueue.create({
        data: {
          entityType: SubmissionEntityType.PERFUME,
          status: SubmissionStatus.PENDING,
          rawPayload: JSON.parse(JSON.stringify(input)) as Prisma.InputJsonValue,
          submittedById: input.submittedBy,
        },
      });

      const resolvedBrand = await this.resolveBrand(
        tx,
        input.brandId,
        input.brandName,
      );

      const rawNoteNames = (input.rawNotes ?? []).map((note) => note.rawName);

      const notesResolution = await this.resolveNotes(tx, rawNoteNames);
      const perfumersResolution = await this.resolvePerfumers(
        tx,
        input.rawPerfumerNames ?? [],
      );
      const accordsResolution = await this.resolveAccords(
        tx,
        input.rawAccords ?? [],
      );

      const mandatoryRequirementsPassed =
        missingRequirements.length === 0 && resolvedBrand !== null;

      const status = mandatoryRequirementsPassed
        ? SubmissionStatus.REQUIREMENTS_PASSED
        : SubmissionStatus.REJECTED;

      const noteLookup = new Map<string, string>(
        notesResolution.resolved.map((resolved) => [
          CanonicalNote.normalizeAlias(resolved.rawName),
          resolved.canonicalNoteId,
        ]),
      );

      const resolvedPayload = {
        brandId: resolvedBrand?.id ?? null,
        collectionId: input.collectionId ?? null,
        name: input.name,
        description: input.description ?? null,
        imageUrl: input.imageUrl ?? null,
        storeUrl: input.storeUrl ?? null,
        releaseYear: input.releaseYear ?? null,
        perfumers: perfumersResolution.resolved,
        notes: (input.rawNotes ?? []).map((note) => ({
          rawName: note.rawName,
          level: note.level,
          canonicalNoteId:
            noteLookup.get(CanonicalNote.normalizeAlias(note.rawName)) ?? null,
        })),
        accords: accordsResolution.resolved,
      };

      const entityResolution = {
        brand: resolvedBrand
          ? {
              brandId: resolvedBrand.id,
              name: resolvedBrand.name,
            }
          : null,
        notes: notesResolution.resolved,
        unresolvedNotes: notesResolution.unresolved,
        perfumers: perfumersResolution.resolved,
        unresolvedPerfumers: perfumersResolution.unresolved,
        accords: accordsResolution.resolved,
        unresolvedAccords: accordsResolution.unresolved,
      };

      const rejectionReason =
        status === SubmissionStatus.REJECTED
          ? this.buildRejectionReason(
              missingRequirements,
              resolvedBrand === null,
            )
          : null;

      const updatedSubmission = await tx.submissionQueue.update({
        where: {
          id: pendingSubmission.id,
        },
        data: {
          status,
          resolvedPayload: JSON.parse(
            JSON.stringify(resolvedPayload),
          ) as Prisma.InputJsonValue,
          entityResolution: JSON.parse(
            JSON.stringify(entityResolution),
          ) as Prisma.InputJsonValue,
          missingRequirements,
          rejectionReason,
          resolvedBrandId: resolvedBrand?.id ?? null,
          entityResolvedAt: new Date(),
          requirementsVerifiedAt: new Date(),
        },
      });

      return {
        submissionId: updatedSubmission.id,
        status: updatedSubmission.status,
        missingRequirements,
        resolvedBrandId: resolvedBrand?.id ?? null,
        resolvedNotes: notesResolution.resolved,
        unresolvedNotes: notesResolution.unresolved,
        resolvedPerfumers: perfumersResolution.resolved,
        unresolvedPerfumers: perfumersResolution.unresolved,
        resolvedAccords: accordsResolution.resolved,
        unresolvedAccords: accordsResolution.unresolved,
      };
    });
  }

  private validate(input: SubmitNewPerfumeInput): void {
    if (!input.submittedBy) {
      throw new Error('submittedBy is required.');
    }

    if (!input.name.trim()) {
      throw new Error('Perfume name is required.');
    }

    for (const rawNote of input.rawNotes ?? []) {
      if (!isPyramidLevel(rawNote.level)) {
        throw new Error(
          `Invalid pyramid level: ${String(rawNote.level)}.`,
        );
      }
    }
  }

  private collectMissingRequirements(input: SubmitNewPerfumeInput): string[] {
    const missing: string[] = [];

    if (!input.name.trim()) {
      missing.push('name');
    }

    if (!input.description?.trim()) {
      missing.push('description');
    }

    if (!input.imageUrl?.trim()) {
      missing.push('imageUrl');
    }

    if (!input.storeUrl?.trim()) {
      missing.push('storeUrl');
    }

    if (!input.brandId?.trim() && !input.brandName?.trim()) {
      missing.push('brand');
    }

    return missing;
  }

  private async resolveBrand(
    tx: Prisma.TransactionClient,
    brandId?: string,
    brandName?: string,
  ) {
    if (brandId) {
      return tx.brand.findUnique({
        where: {
          id: brandId,
        },
      });
    }

    if (brandName) {
      return tx.brand.findFirst({
        where: {
          name: {
            equals: brandName.trim(),
            mode: 'insensitive',
          },
        },
      });
    }

    return null;
  }

  private async resolveNotes(
    tx: Prisma.TransactionClient,
    rawNames: readonly string[],
  ): Promise<{
    resolved: ResolvedNoteRef[];
    unresolved: string[];
  }> {
    const uniqueRawNames = [
      ...new Set(rawNames.map((name) => name.trim()).filter(Boolean)),
    ];

    if (uniqueRawNames.length === 0) {
      return {
        resolved: [],
        unresolved: [],
      };
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

    return {
      resolved,
      unresolved,
    };
  }

  private async resolvePerfumers(
    tx: Prisma.TransactionClient,
    rawNames: readonly string[],
  ): Promise<{
    resolved: ResolvedPerfumerRef[];
    unresolved: string[];
  }> {
    const uniqueRawNames = [
      ...new Set(rawNames.map((name) => name.trim()).filter(Boolean)),
    ];

    if (uniqueRawNames.length === 0) {
      return {
        resolved: [],
        unresolved: [],
      };
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

    return {
      resolved,
      unresolved,
    };
  }

  private async resolveAccords(
    tx: Prisma.TransactionClient,
    rawNames: readonly string[],
  ): Promise<{
    resolved: ResolvedAccordRef[];
    unresolved: string[];
  }> {
    const uniqueRawNames = [
      ...new Set(rawNames.map((name) => name.trim()).filter(Boolean)),
    ];

    if (uniqueRawNames.length === 0) {
      return {
        resolved: [],
        unresolved: [],
      };
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

    return {
      resolved,
      unresolved,
    };
  }

  private buildRejectionReason(
    missingRequirements: string[],
    brandMissing: boolean,
  ): string {
    const reasons: string[] = [];

    if (missingRequirements.length > 0) {
      reasons.push(`Missing mandatory fields: ${missingRequirements.join(', ')}`);
    }

    if (brandMissing) {
      reasons.push('Brand could not be resolved.');
    }

    return reasons.length > 0 ? reasons.join(' ') : 'Submission rejected.';
  }
}
