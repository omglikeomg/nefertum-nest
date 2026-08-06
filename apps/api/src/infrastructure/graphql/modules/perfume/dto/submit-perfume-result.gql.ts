import { Field, ID, ObjectType } from '@nestjs/graphql';
import type { SubmissionStatus } from '@prisma/client';

@ObjectType('SubmitNewPerfumeResult')
export class SubmitNewPerfumeResultGql {
  @Field(() => ID)
  submissionId!: string;

  @Field()
  status!: SubmissionStatus;

  @Field(() => [String])
  missingRequirements!: string[];

  @Field(() => ID, { nullable: true })
  resolvedBrandId?: string | null;
}
