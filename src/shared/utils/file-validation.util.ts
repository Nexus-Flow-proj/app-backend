import { BadRequestException } from '@nestjs/common';

export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_ATTACHMENT_FILES_COUNT = 5;

const ALLOWED_AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

const DISALLOWED_ATTACHMENT_EXTENSIONS = [
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.php',
  '.js',
  '.vbs',
];

/**
 * Filter callback for avatar image uploads
 */
export const avatarFileFilter = (
  req: any,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype)) {
    return callback(
      new BadRequestException(
        'Invalid file format. Only JPEG, PNG, WEBP, GIF, and SVG images are allowed for avatars.',
      ),
      false,
    );
  }
  callback(null, true);
};

/**
 * Filter callback for task attachment uploads
 */
export const attachmentFileFilter = (
  req: any,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  const extension = file.originalname.substring(
    file.originalname.lastIndexOf('.'),
  ).toLowerCase();

  if (DISALLOWED_ATTACHMENT_EXTENSIONS.includes(extension)) {
    return callback(
      new BadRequestException(
        `File extension ${extension} is not allowed for security reasons.`,
      ),
      false,
    );
  }
  callback(null, true);
};

/**
 * Sanitizes a filename to prevent path traversal and odd characters
 */
export function sanitizeFileName(originalname: string): string {
  const nameWithoutPath = originalname.split(/[/\\]/).pop() || 'file';
  return nameWithoutPath.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}
