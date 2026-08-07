import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { CommandBus } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma/prisma.service';
import { ApproveSubmissionCommand } from '../../application/catalog/perfume/commands/approve-submission/approve-submission.command';
import {
  CheckReport,
  PERFUME_SUBMISSION_QUEUE,
  PerfumeSubmissionJobData,
  PerfumeSubmissionPayload,
  parsePerfumeSubmissionPayload,
} from '../../application/submissions/submission.types';
import type { Prisma as PrismaTypes } from '@prisma/client';

import { BrandResolutionChecker } from './checkers/brand-resolution.checker';
import { NoteTaxonomyChecker } from './checkers/note-taxonomy.checker';
import { UrlAndImageHealthChecker } from './checkers/url-and-image-health.checker';
import { DuplicateSignatureChecker } from './checkers/duplicate-signature.checker';
import { ConfidenceCalculator } from './checkers/confidence.calculator';

export const PERFUME_SUBMISSION_JOB_NAME = 'verify-perfume-submission';

interface ProcessorResult {
  status: 'approved' | 'needs_review';
}

@Injectable()
@Processor(PERFUME_SUBMISSION_QUEUE)
export class SubmissionProcessor extends WorkerHost {
  private readonly logger = new Logger(SubmissionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commandBus: CommandBus,
    private readonly brandChecker: BrandResolutionChecker,
    private readonly noteChecker: NoteTaxonomyChecker,
    private readonly urlAndImageChecker: UrlAndImageHealthChecker,
    private readonly duplicateChecker: DuplicateSignatureChecker,
    private readonly confidence: ConfidenceCalculator,
  ) {
    super();
  }

  async process(job: Job<PerfumeSubmissionJobData>): Promise<ProcessorResult> {
    const { submissionId } = job.data;

    const submission = await this.prisma.perfumeSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      this.logger.warn(`Submission ${submissionId} not found — skipping.`);
      return { status: 'needs_review' };
    }

    if (submission.status === 'APPROVED' || submission.status === 'REJECTED') {
      return {
        status: submission.status === 'APPROVED' ? 'approved' : 'needs_review',
      };
    }

    await this.prisma.perfumeSubmission.update({
      where: { id: submissionId },
      data: { status: 'PROCESSING', processedAt: new Date() },
    });

    let payload: PerfumeSubmissionPayload;
    try {
      payload = parsePerfumeSubmissionPayload(submission.payload);
    } catch (err) {
      const message = (err as Error).message ?? 'Invalid payload';
      await this.flipToNeedsReview(submissionId, message);
      return { status: 'needs_review' };
    }

    const checkReport = await this.runChecks(submissionId, payload);

    await this.prisma.perfumeSubmission.update({
      where: { id: submissionId },
      data: {
        checkReport: JSON.parse(JSON.stringify(checkReport)) as Prisma.InputJsonValue,
      },
    });

    if (!checkReport.confidence.autoApprovable) {
      await this.flipToNeedsReview(
        submissionId,
        `Auto-approval gate failed: ${checkReport.confidence.hardFailures.join(', ') || 'score too low'}`,
      );
      return { status: 'needs_review' };
    }

    try {
      await this.commandBus.execute(
        new ApproveSubmissionCommand({
          submissionId,
          input: {
            submissionId,
            approvedBy: null,
            autoApproved: true,
          },
        }),
      );
      return { status: 'approved' };
    } catch (err) {
      const message = (err as Error).message ?? 'Auto-approval failed';
      this.logger.error(`Auto-approval failed for ${submissionId}: ${message}`);
      await this.flipToNeedsReview(submissionId, message);
      return { status: 'needs_review' };
    }
  }

  @OnWorkerEvent('failed')
  async onFailure(job: Job<PerfumeSubmissionJobData> | undefined, err: Error): Promise<void> {
    if (!job) return;

    this.logger.error(`Job ${job.id} failed after attempts: ${err.message ?? 'unknown'}`);

    await this.prisma.perfumeSubmission
      .update({
        where: { id: job.data.submissionId },
        data: {
          status: 'NEEDS_REVIEW',
          rejectionReason: `Worker failure: ${err.message ?? 'unknown'}`,
        },
      })
      .catch(() => {
        /* submission may not exist */
      });
  }

  private async runChecks(
    submissionId: string,
    payload: PerfumeSubmissionPayload,
  ): Promise<CheckReport> {
    return this.prisma.$transaction(async (tx: PrismaTypes.TransactionClient) => {
      const brand = await this.brandChecker.check(tx, payload);
      const notes = await this.noteChecker.check(tx, payload);
      const urlAndImage = await this.urlAndImageChecker.check(payload);
      const duplicate = await this.duplicateChecker.check(
        tx,
        payload,
        brand.resolvedBrandId ?? null,
      );

      const confidence = this.confidence.calculate({
        brand,
        notes,
        urlAndImage,
        duplicate,
        isLowTrustSubmitter: false,
        mandatoryFieldsPresent: this.checkMandatoryFields(payload),
      });

      void submissionId;

      return { brand, notes, urlAndImage, duplicate, confidence };
    });
  }

  private checkMandatoryFields(payload: PerfumeSubmissionPayload): boolean {
    return Boolean(
      payload.name?.trim() &&
      payload.description?.trim() &&
      payload.imageUrl?.trim() &&
      payload.storeUrl?.trim() &&
      (payload.brandId?.trim() || payload.brandName?.trim()),
    );
  }

  private async flipToNeedsReview(submissionId: string, rejectionReason: string): Promise<void> {
    await this.prisma.perfumeSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'NEEDS_REVIEW',
        rejectionReason,
      } as Prisma.PerfumeSubmissionUpdateInput,
    });
  }
}
