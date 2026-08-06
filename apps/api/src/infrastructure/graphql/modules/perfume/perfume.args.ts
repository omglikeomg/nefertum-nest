import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class PerfumeArgs {
  @Field(() => ID)
  id!: string;
}
