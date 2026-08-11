import { CommandBus } from '@nestjs/cqrs';

import { SubmitNewPerfumeCommand } from '../../../application/catalog/perfume/commands/submit-new-perfume/submit-new-perfume.command';
import { ApproveSubmissionCommand } from '../../../application/catalog/perfume/commands/approve-submission/approve-submission.command';
import type { ApproveSubmissionLayer } from '../../../application/catalog/perfume/commands/approve-submission/approve-submission.command';
import type { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { FragranticaScraperService } from '../scraper/fragrantica-scraper.service';
import type { ScrapedPerfume } from '../scraper/scraper.types';

const SEEDER_SYSTEM_USER_EMAIL = 'seeder@nefertum.local';

export interface SeedPipelineResult {
  submissionId: string;
  perfumeId: string;
  attempted: { min: boolean; mid: boolean; full: boolean };
}

async function getOrCreateSystemUserId(
  prisma: PrismaService,
  userId: string | undefined,
): Promise<string> {
  if (userId) {
    return userId;
  }
  const existing = await prisma.user.findUnique({
    where: { email: SEEDER_SYSTEM_USER_EMAIL },
    select: { id: true },
  });
  if (existing) {
    return existing.id;
  }
  const created = await prisma.user.create({
    data: {
      email: SEEDER_SYSTEM_USER_EMAIL,
      username: 'seeder',
      role: 'ADMIN',
      isActive: true,
    },
    select: { id: true },
  });
  return created.id;
}

export async function ensureScraperClose(
  scraper: FragranticaScraperService,
): Promise<void> {
  await scraper.close();
}

export async function runSeedPipeline(args: {
  prisma: PrismaService;
  commandBus: CommandBus;
  scraper: FragranticaScraperService;
  scraped: ScrapedPerfume;
  url: string;
  layers: ReadonlyArray<ApproveSubmissionLayer>;
}): Promise<SeedPipelineResult> {
  const {
    prisma,
    commandBus,
    scraped,
    url,
    layers,
  } = args;

  if (!scraped.title || !scraped.brand) {
    throw new Error(`Missing title or brand in scraped payload for ${url}`);
  }

  const submittedBy = await getOrCreateSystemUserId(
    prisma,
    process.env.SEEDER_SYSTEM_USER_ID,
  );

  const submissionResult = await commandBus.execute(
    new SubmitNewPerfumeCommand({
      submittedBy,
      name: scraped.title,
      brandName: scraped.brand,
      description: scraped.description ?? undefined,
      releaseYear: scraped.releaseYear ?? undefined,
      rawNotes: [
        ...scraped.notePyramid.TOP.map((name) => ({
          rawName: name,
          level: 'TOP' as const,
        })),
        ...scraped.notePyramid.HEART.map((name) => ({
          rawName: name,
          level: 'HEART' as const,
        })),
        ...scraped.notePyramid.BASE.map((name) => ({
          rawName: name,
          level: 'BASE' as const,
        })),
      ],
      rawAccords: scraped.accordBars.map((bar) => bar.label),
      rawPerfumerNames: scraped.perfumers.map((p) => p.name),
    }),
  );

  if (submissionResult.status !== ('REQUIREMENTS_PASSED' as never)) {
    throw new Error(
      `Submission ${submissionResult.submissionId} did not pass requirements (status=${String(submissionResult.status)})`,
    );
  }

  const perfumerBios = scraped.perfumers
    .filter((p) => p.bio)
    .map((p, idx) => {
      const matched = submissionResult.resolvedPerfumers.find(
        (r: { perfumerName: string }) => r.perfumerName === p.name,
      );
      return matched && p.bio
        ? { perfumerId: matched.perfumerId, bio: p.bio }
        : { perfumerId: `unresolved-${idx}`, bio: p.bio ?? '' };
    });

  const approveResult = await commandBus.execute(
    new ApproveSubmissionCommand(submissionResult.submissionId, layers, scraped.histograms, perfumerBios),
  );

  return {
    submissionId: approveResult.submissionId,
    perfumeId: approveResult.perfumeId,
    attempted: {
      min: layers.includes('catalog-min'),
      mid: layers.includes('catalog-mid'),
      full: layers.includes('catalog-full'),
    },
  };
}
