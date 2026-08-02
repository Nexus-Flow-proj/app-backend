import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sanitizeFileName } from '@shared/utils/file-validation.util';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private supabase: SupabaseClient;

  private readonly AVATARS_BUCKET = 'avatars';
  private readonly ATTACHMENTS_BUCKET = 'attachments';

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('env.supabaseUrl') || process.env.SUPABASE_URL || '';
    const serviceRoleKey =
      this.configService.get<string>('env.supabaseServiceRoleKey') ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      '';

    if (!supabaseUrl || !serviceRoleKey) {
      this.logger.error('Supabase URL or Service Role Key is missing in configuration.');
    }

    this.supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }

  /**
   * Upload user avatar to 'avatars' bucket
   */
  async uploadAvatar(
    userId: string,
    buffer: Buffer,
    mimeType: string,
    originalName: string,
  ): Promise<string> {
    const sanitized = sanitizeFileName(originalName);
    const filePath = `${userId}/${Date.now()}-${sanitized}`;

    const { data, error } = await this.supabase.storage
      .from(this.AVATARS_BUCKET)
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      this.logger.error(`Failed to upload avatar for user ${userId}: ${error.message}`);
      throw new InternalServerErrorException(`Avatar upload failed: ${error.message}`);
    }

    const { data: publicUrlData } = this.supabase.storage
      .from(this.AVATARS_BUCKET)
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  }

  /**
   * Delete user avatar from 'avatars' bucket
   */
  async deleteAvatar(avatarUrl: string): Promise<void> {
    if (!avatarUrl) return;

    try {
      const storagePath = this.extractPathFromUrl(avatarUrl, this.AVATARS_BUCKET);
      if (!storagePath) return;

      const { error } = await this.supabase.storage
        .from(this.AVATARS_BUCKET)
        .remove([storagePath]);

      if (error) {
        this.logger.warn(`Failed to delete avatar (${storagePath}): ${error.message}`);
      }
    } catch (err) {
      this.logger.warn(`Error deleting avatar file from storage: ${err}`);
    }
  }

  /**
   * Upload single task attachment to 'attachments' bucket
   */
  async uploadAttachment(
    taskId: string,
    buffer: Buffer,
    mimeType: string,
    originalName: string,
  ): Promise<{ publicUrl: string; storagePath: string }> {
    const sanitized = sanitizeFileName(originalName);
    const filePath = `${taskId}/${Date.now()}-${sanitized}`;

    const { data, error } = await this.supabase.storage
      .from(this.ATTACHMENTS_BUCKET)
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      this.logger.error(`Failed to upload attachment for task ${taskId}: ${error.message}`);
      throw new InternalServerErrorException(`Attachment upload failed: ${error.message}`);
    }

    const { data: publicUrlData } = this.supabase.storage
      .from(this.ATTACHMENTS_BUCKET)
      .getPublicUrl(data.path);

    return {
      publicUrl: publicUrlData.publicUrl,
      storagePath: data.path,
    };
  }

  /**
   * Delete single attachment from 'attachments' bucket by path or URL
   */
  async deleteAttachment(pathOrUrl: string): Promise<void> {
    if (!pathOrUrl) return;

    try {
      let storagePath = pathOrUrl;
      if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
        const extracted = this.extractPathFromUrl(pathOrUrl, this.ATTACHMENTS_BUCKET);
        if (extracted) storagePath = extracted;
      }

      const { error } = await this.supabase.storage
        .from(this.ATTACHMENTS_BUCKET)
        .remove([storagePath]);

      if (error) {
        this.logger.warn(`Failed to delete attachment (${storagePath}): ${error.message}`);
      }
    } catch (err) {
      this.logger.warn(`Error deleting attachment file from storage: ${err}`);
    }
  }

  /**
   * Helper to extract relative storage path from Supabase public URL
   */
  private extractPathFromUrl(url: string, bucketName: string): string | null {
    try {
      const bucketMarker = `/storage/v1/object/public/${bucketName}/`;
      const index = url.indexOf(bucketMarker);
      if (index !== -1) {
        return url.substring(index + bucketMarker.length);
      }
      // Alternative fallback: split by bucket name
      const parts = url.split(`/${bucketName}/`);
      if (parts.length > 1) {
        return parts[1];
      }
      return null;
    } catch {
      return null;
    }
  }
}
