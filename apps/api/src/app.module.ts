import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'node:path';

import { CatalogModule } from './modules/catalog.module';
import { PrismaModule } from './modules/prisma.module';

@Module({
  imports: [
    PrismaModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'apps/api/schema.gql'),
      sortSchema: true,
      playground: true,
      introspection: true,
    }),
    CatalogModule,
  ],
})
export class AppModule {}
