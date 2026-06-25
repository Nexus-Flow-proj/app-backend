import { Match } from '@shared/decorators/match.decorator';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;

  @MinLength(6)
  @Match('newPassword', { message: 'Passwords do not match' })
  @IsNotEmpty()
  confirmPassword!: string;
}
