import { Expose } from 'class-transformer';

export class InviteLinkResponseDto {
  @Expose()
  inviteLink!: string;
}
