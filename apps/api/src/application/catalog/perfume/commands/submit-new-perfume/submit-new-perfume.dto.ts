import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PYRAMID_LEVELS } from '../../../../../domain/catalog/perfume/entities/perfume.aggregate';

export class SubmitNewPerfumeRawNoteDto {
  @IsString()
  @Length(1, 100)
  rawName!: string;

  @IsEnum(PYRAMID_LEVELS)
  level!: 'TOP' | 'HEART' | 'BASE';
}

export class SubmitNewPerfumeDto {
  @IsString()
  @Length(1, 200)
  name!: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  brandName?: string;

  @IsOptional()
  @IsString()
  collectionId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  imageUrl?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  storeUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1300)
  @Max(new Date().getFullYear() + 1)
  releaseYear?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  rawPerfumerNames?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SubmitNewPerfumeRawNoteDto)
  rawNotes?: SubmitNewPerfumeRawNoteDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  rawAccords?: string[];
}
