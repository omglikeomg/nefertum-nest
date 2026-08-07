import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../../../infrastructure/database/prisma/prisma.service';

import { ApproveSubmissionCommand } from './approve-submission.command';
import type {
  ApproveSubmissionInput,
  ApproveSubmissionResult,
  ResolvedPayload,
} from './approve-submission.types';
import {
  PerfumeMaterializationService,
  type MaterializationInput,
} from '../../services/perfume-materialization.service';

@Injectable()
@CommandHandler(ApproveSubmissionCommand)
export class ApproveSubmissionHandler implements ICommandHandler<
  ApproveSubmissionCommand,
  ApproveSubmissionResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly materialization: PerfumeMaterializationService,
  ) {}

  async execute(command: ApproveSubmissionCommand): Promise<ApproveSubmissionResult> {
    const normalized = this.normalize(command);

    const submission = await this.prisma.perfumeSubmission.findUnique({
      where: { id: normalized.submissionId },
    });

    if (!submission) {
      throw new NotFoundException(`Submission ${normalized.submissionId} not found.`);
    }

    if (submission.status === 'APPROVED' && !submission.materializedPerfumeId) {
      throw new ConflictException(
        `Submission ${normalized.submissionId} is approved but has no materializedPerfumeId.`,
      );
    }

    if (submission.status === 'REJECTED') {
      throw new BadRequestException(
        `Submission ${normalized.submissionId} is rejected and cannot be approved.`,
      );
    }

    const payload = submission.payload as unknown as ResolvedPayload;

    const materializationInput: MaterializationInput = {
      submissionId: normalized.submissionId,
      resolvedPayload: payload,
      approvedBy: normalized.approvedBy,
      autoApproved: normalized.autoApproved,
      overrides: normalized.overrides,
      layers: normalized.layers,
    };

    return this.prisma.$transaction(async (tx) => {
      const { perfumeId, alreadyApproved } = await this.materialization.materialize(
        materializationInput,
        tx,
      );

      return {
        perfumeId,
        submissionId: normalized.submissionId,
        alreadyApproved,
        materialized: {
          perfume: true,
          perfumeNotes: 0,
          accords: 0,
          perfumers: 0,
          histograms: 0,
        },
      };
    });
  }

  private normalize(command: ApproveSubmissionCommand): {
    submissionId: string;
    approvedBy?: string | null;
    autoApproved?: boolean;
    overrides?: ApproveSubmissionInput['overrides'];
    layers?: ReadonlyArray<'catalog-min' | 'catalog-mid' | 'catalog-full'>;
  } {
    if (command.mode === 'tuple') {
      return {
        submissionId: command.submissionId,
        layers: command.layers,
      };
    }

    const input = command.input as ApproveSubmissionInput;

    return {
      submissionId: command.submissionId,
      approvedBy: input.approvedBy,
      autoApproved: input.autoApproved,
      overrides: input.overrides,
    };
  }
}
