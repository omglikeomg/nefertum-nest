import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CommandBus } from '@nestjs/cqrs';
import { Field, InputType } from '@nestjs/graphql';

import { SubmitPerfumeCommand } from '../../../../application/submissions/commands/submit-perfume/submit-perfume.command';

@InputType()
export class SubmitPerfumeGqlInput {
  @Field()
  name!: string;

  @Field({ nullable: true })
  brandName?: string;

  @Field({ nullable: true })
  brandId?: string;

  @Field(() => [String], { nullable: true })
  rawNotes?: string[];

  @Field(() => [String], { nullable: true })
  rawPerfumerNames?: string[];

  @Field(() => [String], { nullable: true })
  rawAccords?: string[];

  @Field({ nullable: true })
  storeUrl?: string;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field({ nullable: true })
  releaseYear?: number;

  @Field({ nullable: true })
  description?: string;
}

@Resolver()
export class PerfumeSubmissionResolver {
  constructor(private readonly commandBus: CommandBus) {}

  @Mutation(() => String, { name: 'submitPerfume' })
  async submitPerfume(@Args('payload') payload: SubmitPerfumeGqlInput): Promise<string> {
    const result = await this.commandBus.execute(
      new SubmitPerfumeCommand({
        submittedBy: null,
        payload,
      }),
    );
    return result.submissionId;
  }
}
