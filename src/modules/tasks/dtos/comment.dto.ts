import { Expose, Type } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { TaskUserDto } from './task.dto';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  body!: string;
}

export class CommentResponseDto {
  @Expose()
  id!: string;

  @Expose()
  body!: string;

  @Expose()
  @Type(() => TaskUserDto)
  user!: TaskUserDto;

  @Expose()
  created_at!: Date;
}
