import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

import {
  PERFUME_SUBMISSION_QUEUE,
  PerfumeSubmissionJobData,
  parsePerfumeSubmissionPayload,
} from '../../submission.types';
import { SubmitPerfumeCommand, SubmitPerfumeResult } from './submit-perfume.command';

@Injectable()
@CommandHandler(SubmitPerfumeCommand)
export class SubmitPerfumeHandler implements ICommandHandler<
  SubmitPerfumeCommand,
  SubmitPerfumeResult
> {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(PERFUME_SUBMISSION_QUEUE)
    private readonly queue: Queue<PerfumeSubmissionJobData>,
  ) {}

  async execute(command: SubmitPerfumeCommand): Promise<SubmitPerfumeResult> {
    const validated = parsePerfumeSubmissionPayload(command.input.payload);

    const submission = await this.prisma.perfumeSubmission.create({
      data: {
        status: 'QUEUED',
        payload: JSON.parse(JSON.stringify(validated)) as Prisma.InputJsonValue,
        submittedById: command.input.submittedBy ?? null,
      },
    });

    await this.queue.add(
      'verify-perfume-submission',
      { submissionId: submission.id },
      {
        jobId: submission.id,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return {
      submissionId: submission.id,
      status: 'QUEUED',
    };
  }
}
