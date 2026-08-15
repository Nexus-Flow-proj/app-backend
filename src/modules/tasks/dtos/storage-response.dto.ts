import { Expose, Type } from 'class-transformer';
import { ApiUserSummaryDto } from './task.dto';

// ─── Avatar ────────────────────────────────────────────────────────────────

export class AvatarUploadResponseDto {
  @Expose()
  avatarUrl: string;

  @Expose()
  fileName: string;

  @Expose()
  mimeType: string;

  @Expose()
  fileSize: number;

  @Expose()
  updatedAt: Date;
}

// ─── Attachments ───────────────────────────────────────────────────────────

export class AttachmentDto {
  @Expose()
  id: string;

  @Expose()
  fileName: string;

  @Expose()
  fileUrl: string;

  @Expose()
  mimeType: string;

  @Expose()
  size: number;

  @Expose()
  @Type(() => ApiUserSummaryDto)
  uploadedBy: ApiUserSummaryDto;

  @Expose()
  created_at: string;
}

export class AttachmentUploadResponseDto {
  /** The newly uploaded attachments only */
  @Expose()
  @Type(() => AttachmentDto)
  newAttachments: AttachmentDto[];

  /** All attachments on the task after the upload */
  @Expose()
  @Type(() => AttachmentDto)
  allAttachments: AttachmentDto[];

  @Expose()
  taskId: string;

  @Expose()
  attachmentsCount: number;
}

export class AttachmentDeleteResponseDto {
  /** The attachment that was removed */
  @Expose()
  @Type(() => AttachmentDto)
  deletedAttachment: AttachmentDto;

  /** All remaining attachments on the task */
  @Expose()
  @Type(() => AttachmentDto)
  remainingAttachments: AttachmentDto[];

  @Expose()
  taskId: string;

  @Expose()
  attachmentsCount: number;
}
