import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { KnowledgeSourceType } from '../entities/knowledge-chunk.entity';

export class CreateKnowledgeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;

  @IsOptional()
  @IsEnum(KnowledgeSourceType)
  sourceType?: KnowledgeSourceType;
}

export class UpdateKnowledgeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content?: string;

  @IsOptional()
  @IsEnum(KnowledgeSourceType)
  sourceType?: KnowledgeSourceType;
}

export class SearchKnowledgeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  query!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number = 5;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  minSimilarity?: number = 0.3;
}

export interface KnowledgeSearchResult {
  id: string;
  projectId: string;
  title: string;
  content: string;
  sourceType: string;
  similarity: number;
}
