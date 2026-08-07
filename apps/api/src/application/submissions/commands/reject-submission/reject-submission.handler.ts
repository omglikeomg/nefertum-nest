import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

import { RejectSubmissionCommand, RejectSubmissionResult } from './reject-submission.command';

@Injectable()
@CommandHandler(RejectSubmissionCommand)
export class RejectSubmissionHandler implements ICommandHandler<
  RejectSubmissionCommand,
  RejectSubmissionResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: RejectSubmissionCommand): Promise<RejectSubmissionResult> {
    const { submissionId, reason, rejectedBy } = command.input;

    return this.prisma.$transaction(async (tx) => {
      const submission = await tx.perfumeSubmission.findUnique({
        where: { id: submissionId },
      });

      if (!submission) {
        throw new NotFoundException(`Submission ${submissionId} not found.`);
      }

      if (submission.status === 'APPROVED') {
        throw new BadRequestException('Cannot reject a submission that has already been approved.');
      }

      await tx.perfumeSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'REJECTED',
          rejectionReason: reason,
          reviewedById: rejectedBy ?? null,
          reviewedAt: new Date(),
        },
      });

      return {
        submissionId,
        status: 'REJECTED',
      };
    });
  }
}
