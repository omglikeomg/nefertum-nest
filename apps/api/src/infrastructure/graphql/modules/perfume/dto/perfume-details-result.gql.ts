import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('PerfumeDetails')
export class PerfumeDetailsResultGql {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  slug!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => Int, { nullable: true })
  releaseYear?: number | null;

  @Field({ defaultValue: false })
  discontinued!: boolean;
}
