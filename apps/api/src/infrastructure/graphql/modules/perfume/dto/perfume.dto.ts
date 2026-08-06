import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PYRAMID_LEVELS } from '../../../../../domain/catalog/perfume/entities/perfume.aggregate';

@InputType()
export class RawNoteInputDto {
  @Field()
  @IsString()
  @Length(1, 100)
  rawName!: string;

  @Field(() => String)
  @IsString()
  level!: 'TOP' | 'HEART' | 'BASE';
}

@InputType()
export class SubmitNewPerfumeGraphqlInput {
  @Field()
  @IsString()
  @Length(1, 200)
  name!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  brandId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  brandName?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  collectionId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  imageUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  storeUrl?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1300)
  @Max(new Date().getFullYear() + 1)
  releaseYear?: number;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  rawPerfumerNames?: string[];

  @Field(() => [RawNoteInputDto], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => RawNoteInputDto)
  rawNotes?: RawNoteInputDto[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  rawAccords?: string[];
}
