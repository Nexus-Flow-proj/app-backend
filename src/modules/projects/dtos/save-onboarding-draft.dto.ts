import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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
