import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GraphQLSchemaBuilderModule, GraphQLSchemaFactory } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { printSchema } from 'graphql';
import { GetPerfumesForComparisonQuery } from '../../../../application/catalog/perfume/queries/get-perfumes-for-comparison/get-perfumes-for-comparison.query';
import { PerfumeResolver } from './perfume.resolver';

describe('PerfumeResolver comparison', () => {
  it('COMPARE-API-1: perfumes(ids) dispatches the comparison query and returns its items', async () => {
    const items = [{ id: 'a' }];
    const queryBus = { execute: jest.fn().mockResolvedValue(items) };
    const resolver = new PerfumeResolver(queryBus as unknown as QueryBus, {} as CommandBus);
    await expect(resolver.getPerfumes(['a', 'b'])).resolves.toBe(items);
    expect(queryBus.execute).toHaveBeenCalledWith(new GetPerfumesForComparisonQuery(['a', 'b']));
  });

  it('COMPARE-API-1: the schema exposes perfumes(ids) with the comparison fields', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [GraphQLSchemaBuilderModule] }).compile();
    const schema = printSchema(await moduleRef.get(GraphQLSchemaFactory).create([PerfumeResolver]));
    expect(schema).toContain('perfumes(ids: [ID!]!): [PerfumeComparison!]!');
    expect(schema).toContain('perfume(id: ID!): PerfumeDetails!');
    expect(schema).toMatch(/type PerfumeScaleHistogram \{[^}]*buckets: \[Int!\]!/);
    expect(schema).toMatch(/type PerfumeComparison \{[^}]*brand: PerfumeBrand!/);
    expect(schema).toMatch(/type PerfumeComparison \{[^}]*notes: PerfumeNotePyramid!/);
  });
});
