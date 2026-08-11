import { Command } from 'nest-commander';
import { CommandBus } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { FragranticaScraperService } from '../scraper/fragrantica-scraper.service';
import type { ApproveSubmissionLayer } from '../../../application/catalog/perfume/commands/approve-submission/approve-submission.command';
import { SeedBaseCommand } from './seed-catalog-min.command';

@Command({
  name: 'catalog-full',
  description:
    'Seed perfumes through all layers including PerfumeScaleHistogram + Perfumer bios.',
})
@Injectable()
export class SeedCatalogFullCommand extends SeedBaseCommand {
  constructor(
    scraper: FragranticaScraperService,
    prisma: PrismaService,
    commandBus: CommandBus,
  ) {
    super(scraper, prisma, commandBus, 'SeedCatalogFullCommand');
  }

  protected getLayers(): ReadonlyArray<ApproveSubmissionLayer> {
    return ['catalog-min', 'catalog-mid', 'catalog-full'];
  }
}
