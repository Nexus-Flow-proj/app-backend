import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ConstraintsDto,
  ProjectCategory,
} from '../../projects/dtos/save-onboarding-draft.dto';

export { ConstraintsDto, ProjectCategory };

export class GenerateOnboardingPlanDto {
  @IsUUID()
  draftId!: string;

  @IsString()
  @IsNotEmpty()
  prompt!: string;
}

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  role!: 'user' | 'assistant';

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsNotEmpty()
  createdAt!: Date;
}

export class BoardContextColumnDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNotEmpty()
  taskCount!: number;
}

export class BoardContextTaskDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  status!: string;

  @IsString()
  @IsNotEmpty()
  priority!: string;

  @IsString()
  @IsNotEmpty()
  columnName!: string;
}

export class BoardContextDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BoardContextColumnDto)
  columns!: BoardContextColumnDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BoardContextTaskDto)
  taskSample?: BoardContextTaskDto[];
}

export class BoardAIChatDto {
  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BoardContextDto)
  boardContext?: BoardContextDto;
}
