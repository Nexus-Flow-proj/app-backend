import { IsUUID } from 'class-validator';

export class SubmitOnboardingDto {
  @IsUUID()
  draftId!: string;
}
