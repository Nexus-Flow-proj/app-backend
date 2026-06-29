import { Expose, Transform, Type } from 'class-transformer';
import { InviteDto } from './invite.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '@shared/dto/pagination-query.dto';
import { InviteStatus } from '../enums/invite-status.enum';

export class GetInvitesQueryDto extends PaginationQueryDto {
  @IsOptional()
  // 💡 Automatically sanitizes incoming string to uppercase before validation checks it
  @Transform(({ value }) =>
    typeof value === 'string' ? (value.toUpperCase() as InviteStatus) : value,
  )
  @IsEnum(InviteStatus, {
    message: 'Status must be a valid invite status value',
  })
  status?: InviteStatus;
}

export class PaginatedInvitesDto {
  @Expose()
  @Type(() => InviteDto)
  invites!: InviteDto[];

  @Expose()
  total!: number;

  @Expose()
  page!: number;

  @Expose()
  limit!: number;
}
