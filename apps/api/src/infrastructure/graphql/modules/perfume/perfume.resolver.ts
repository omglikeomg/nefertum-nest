import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { SubmitNewPerfumeCommand } from '../../../../application/catalog/perfume/commands/submit-new-perfume/submit-new-perfume.command';
import {
  SubmitNewPerfumeInput,
  SubmitNewPerfumeResult,
} from '../../../../application/catalog/perfume/commands/submit-new-perfume/submit-new-perfume.types';
import { GetPerfumeDetailsQuery } from '../../../../application/catalog/perfume/queries/get-perfume-details/get-perfume-details.query';
import { PerfumeDetailsResult } from '../../../../application/catalog/perfume/queries/get-perfume-details/get-perfume-details.types';
import { SubmitNewPerfumeGraphqlInput } from './dto/perfume.dto';
import { PerfumeDetailsResultGql } from './dto/perfume-details-result.gql';
import { SubmitNewPerfumeResultGql } from './dto/submit-perfume-result.gql';

@Resolver(() => PerfumeDetailsResultGql)
export class PerfumeResolver {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Query(() => PerfumeDetailsResultGql, { name: 'perfume' })
  async getPerfume(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<PerfumeDetailsResultGql> {
    const result: PerfumeDetailsResult = await this.queryBus.execute(
      new GetPerfumeDetailsQuery(id),
    );
    return {
      id: result.id,
      name: result.name,
      slug: result.slug,
      description: result.description,
      releaseYear: result.releaseYear,
      discontinued: result.discontinued,
    };
  }

  @Mutation(() => SubmitNewPerfumeResultGql, { name: 'submitNewPerfume' })
  async submitNewPerfume(
    @Args('input') rawInput: SubmitNewPerfumeGraphqlInput,
    @Args('submittedBy') submittedBy: string,
  ): Promise<SubmitNewPerfumeResultGql> {
    const input: SubmitNewPerfumeInput = {
      submittedBy,
      name: rawInput.name,
      brandId: rawInput.brandId,
      brandName: rawInput.brandName,
      collectionId: rawInput.collectionId ?? null,
      description: rawInput.description,
      imageUrl: rawInput.imageUrl,
      storeUrl: rawInput.storeUrl,
      releaseYear: rawInput.releaseYear ?? null,
      rawPerfumerNames: rawInput.rawPerfumerNames,
      rawNotes: rawInput.rawNotes?.map((n) => ({
        rawName: n.rawName,
        level: n.level as 'TOP' | 'HEART' | 'BASE',
      })),
      rawAccords: rawInput.rawAccords,
    };
    const result = await this.commandBus.execute(new SubmitNewPerfumeCommand(input));
    return {
      submissionId: result.submissionId,
      status: result.status,
      missingRequirements: [...result.missingRequirements],
      resolvedBrandId: result.resolvedBrandId ?? null,
    };
  }
}
