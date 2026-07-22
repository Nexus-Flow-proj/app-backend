import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ProjectCategory {
  PROGRAMMING = 'programming',
  MARKETING = 'marketing',
  DESIGN = 'design',
  GENERAL = 'general',
}

export class ConstraintsDto {
  @IsOptional()
  @IsEnum(ProjectCategory)
  category?: ProjectCategory;

  // Programming options
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetStack?: string[];

  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  // Marketing options
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  marketingChannels?: string[];

  @IsOptional()
  @IsString()
  targetAudience?: string;

  // Design options
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  designDeliverables?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  designTools?: string[];
}

export class OnboardingProjectInfoDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  color!: string;

  @IsOptional()
  @IsString()
  estimatedTime?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConstraintsDto)
  constraints?: ConstraintsDto;
}

export class SaveOnboardingDraftDto {
  @ValidateNested()
  @Type(() => OnboardingProjectInfoDto)
  projectInfo!: OnboardingProjectInfoDto;

  @IsOptional()
  workshopState?: Record<string, unknown>;
}

export class UpdateOnboardingDraftDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => OnboardingProjectInfoDto)
  projectInfo?: OnboardingProjectInfoDto;

  @IsOptional()
  workshopState?: Record<string, unknown>;
}
