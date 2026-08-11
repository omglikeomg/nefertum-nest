import { Module } from '@nestjs/common';

import { CatalogModule } from '../../modules/catalog.module';
import { PrismaModule as InfrastructurePrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

import { FragranticaScraperService } from './scraper/fragrantica-scraper.service';
import { CanonicalNoteResolverService } from './scraper/canonical-note-resolver.service';
import { HistogramExtractorService } from './scraper/histogram-extractor.service';
import { BrandResolverService } from './scraper/brand-resolver.service';

import { InspectFragranticaCommand } from './commands/inspect-fragrantica.command';
import { SeedCatalogMinCommand } from './commands/seed-catalog-min.command';
import { SeedCatalogMidCommand } from './commands/seed-catalog-mid.command';
import { SeedCatalogFullCommand } from './commands/seed-catalog-full.command';

@Module({
  imports: [InfrastructurePrismaModule, CatalogModule],
  providers: [
    PrismaService,
    FragranticaScraperService,
    CanonicalNoteResolverService,
    HistogramExtractorService,
    BrandResolverService,
    InspectFragranticaCommand,
    SeedCatalogMinCommand,
    SeedCatalogMidCommand,
    SeedCatalogFullCommand,
  ],
  exports: [],
})
export class CliModule {}
