import { Command } from 'nest-commander';
import { CommandBus } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { FragranticaScraperService } from '../scraper/fragrantica-scraper.service';
import type { ApproveSubmissionLayer } from '../../../application/catalog/perfume/commands/approve-submission/approve-submission.command';
import { SeedBaseCommand } from './seed-catalog-min.command';

@Command({
  name: 'catalog-mid',
  description:
    'Seed perfumes through the catalog-mid layer (adds PerfumeAccord + Perfumer + PerfumePerfumer).',
})
@Injectable()
export class SeedCatalogMidCommand extends SeedBaseCommand {
  constructor(
    scraper: FragranticaScraperService,
    prisma: PrismaService,
    commandBus: CommandBus,
  ) {
    super(scraper, prisma, commandBus, 'SeedCatalogMidCommand');
  }

  protected getLayers(): ReadonlyArray<ApproveSubmissionLayer> {
    return ['catalog-min', 'catalog-mid'];
  }
}
