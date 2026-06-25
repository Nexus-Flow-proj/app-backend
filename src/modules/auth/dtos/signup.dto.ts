import { Match } from '@shared/decorators/match.decorator';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SignUpDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  firstName!: string;

  @IsString()
  @MinLength(2)
  lastName!: string;

  @MinLength(8)
  password!: string;

  @MinLength(6)
  @Match('password', { message: 'Passwords do not match' })
  @IsNotEmpty()
  confirmPassword!: string;
}
