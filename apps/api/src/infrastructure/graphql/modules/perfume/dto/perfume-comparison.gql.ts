import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('PerfumeBrand')
export class PerfumeBrandGql {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  slug!: string;
}

@ObjectType('PerfumeNote')
export class PerfumeNoteGql {
  @Field(() => ID)
  noteId!: string;

  @Field()
  canonicalName!: string;

  @Field()
  slug!: string;

  @Field(() => Int)
  order!: number;
}

@ObjectType('PerfumeNotePyramid')
export class PerfumeNotePyramidGql {
  @Field(() => [PerfumeNoteGql])
  top!: PerfumeNoteGql[];

  @Field(() => [PerfumeNoteGql])
  heart!: PerfumeNoteGql[];

  @Field(() => [PerfumeNoteGql])
  base!: PerfumeNoteGql[];
}

@ObjectType('PerfumeScaleHistogram')
export class PerfumeScaleHistogramGql {
  @Field()
  metric!: string;

  @Field(() => [Int])
  buckets!: number[];

  @Field(() => Int)
  totalVotes!: number;
}

@ObjectType('PerfumeComparison')
export class PerfumeComparisonGql {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  slug!: string;

  @Field(() => PerfumeBrandGql)
  brand!: PerfumeBrandGql;

  @Field(() => PerfumeNotePyramidGql)
  notes!: PerfumeNotePyramidGql;

  @Field(() => [PerfumeScaleHistogramGql])
  scaleHistograms!: PerfumeScaleHistogramGql[];
}
