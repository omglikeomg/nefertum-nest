import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { PrismaService } from '../../database/prisma/prisma.service';
import { ApproveSubmissionCommand } from '../../../application/catalog/perfume/commands/approve-submission/approve-submission.command';
import { RejectSubmissionCommand } from '../../../application/submissions/commands/reject-submission/reject-submission.command';

import { AdminGuard } from './admin.guard';

interface ListSubmissionsQuery {
  status?: string;
  page?: number;
  pageSize?: number;
}

interface ApproveSubmissionBody {
  brandId?: string;
  brandName?: string;
  collectionId?: string | null;
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  storeUrl?: string | null;
  releaseYear?: number | null;
  perfumerIds?: string[];
  noteAssignments?: { canonicalNoteId: string; level: string }[];
}

interface RejectSubmissionBody {
  reason: string;
}

@Controller('admin/submissions')
@UseGuards(AdminGuard)
export class AdminSubmissionsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async list(@Query() query: ListSubmissionsQuery): Promise<{
    page: number;
    pageSize: number;
    total: number;
    items: Array<{
      id: string;
      status: string;
      confidence: number | null;
      payloadSummary: unknown;
      unresolvedEntities: unknown;
      reviewHighlights: unknown;
    }>;
  }> {
    const page = Math.max(Number(query.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize ?? 20), 1), 100);

    const where = query.status ? { status: query.status as never } : {};

    const [total, rows] = await Promise.all([
      this.prisma.perfumeSubmission.count({ where }),
      this.prisma.perfumeSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = rows.map((row) => ({
      id: row.id,
      status: row.status,
      confidence: row.confidence,
      payloadSummary: summarizePayload(row.payload),
      unresolvedEntities: row.unresolvedEntities,
      reviewHighlights: row.checkReport,
    }));

    return { page, pageSize, total, items };
  }

  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() body: ApproveSubmissionBody,
  ): Promise<{ perfumeId: string; alreadyApproved: boolean }> {
    const result = await this.commandBus.execute(
      new ApproveSubmissionCommand({
        submissionId: id,
        input: {
          submissionId: id,
          overrides: body as never,
        },
      }),
    );

    return {
      perfumeId: result.perfumeId,
      alreadyApproved: result.alreadyApproved,
    };
  }

  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() body: RejectSubmissionBody,
  ): Promise<{ submissionId: string; status: 'REJECTED' }> {
    const result = await this.commandBus.execute(
      new RejectSubmissionCommand({
        submissionId: id,
        reason: body.reason,
      }),
    );

    return {
      submissionId: result.submissionId,
      status: result.status,
    };
  }
}

function summarizePayload(payload: unknown): unknown {
  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>;
    return {
      name: p.name,
      brandName: p.brandName,
      brandId: p.brandId,
    };
  }
  return null;
}
