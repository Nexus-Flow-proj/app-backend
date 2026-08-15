import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SaveMiniWorkshopDto } from '../dtos/mini-workshop/save-mini-workshop.dto';
import { MiniObjectType } from '../enums/mini-object-type.enum';
import { MINI_WORKSHOP_LIMITS } from '../constants/mini-workshop.constants';
import {
  MiniFreehandDataDto,
  MiniImageDataDto,
} from '../dtos/mini-workshop/mini-object-data.dto';

@Injectable()
export class MiniWorkshopValidator {
  validateDocumentOrThrow(dto: SaveMiniWorkshopDto): void {
    const scene = dto.scene;
    const objects = scene.objects ?? [];
    const connections = scene.connections ?? [];
    const assets = scene.assets ?? {};

    // 1. Abuse-protection limit checks on collections
    if (objects.length > MINI_WORKSHOP_LIMITS.MAX_OBJECTS) {
      throw new PayloadTooLargeException(
        `Objects count exceeds limit of ${MINI_WORKSHOP_LIMITS.MAX_OBJECTS}`,
      );
    }
    if (connections.length > MINI_WORKSHOP_LIMITS.MAX_CONNECTIONS) {
      throw new PayloadTooLargeException(
        `Connections count exceeds limit of ${MINI_WORKSHOP_LIMITS.MAX_CONNECTIONS}`,
      );
    }

    const assetEntries = Object.entries(assets);
    if (assetEntries.length > MINI_WORKSHOP_LIMITS.MAX_ASSETS) {
      throw new PayloadTooLargeException(
        `Assets count exceeds limit of ${MINI_WORKSHOP_LIMITS.MAX_ASSETS}`,
      );
    }

    // 2. Validate viewport values
    if (
      !Number.isFinite(scene.viewport.x) ||
      !Number.isFinite(scene.viewport.y) ||
      !Number.isFinite(scene.viewport.scale)
    ) {
      throw new BadRequestException('Viewport values must be finite numbers');
    }

    // 3. Unique IDs and object namespace validation
    const objectIds = new Set<string>();
    for (const obj of objects) {
      if (!obj.id || typeof obj.id !== 'string' || obj.id.trim() === '') {
        throw new BadRequestException('Canvas object ID must be a non-empty string');
      }
      if (objectIds.has(obj.id)) {
        throw new UnprocessableEntityException(
          `Duplicate object ID '${obj.id}' in canvas payload`,
        );
      }
      objectIds.add(obj.id);

      // Validate FREEHAND points length and format
      if (obj.type === MiniObjectType.FREEHAND) {
        const freehandData = obj.data as MiniFreehandDataDto;
        if (
          !Array.isArray(freehandData.points) ||
          freehandData.points.length < 2
        ) {
          throw new UnprocessableEntityException(
            `FREEHAND object '${obj.id}' must contain at least 2 point tuples`,
          );
        }
        if (
          freehandData.points.length > MINI_WORKSHOP_LIMITS.MAX_FREEHAND_POINTS
        ) {
          throw new PayloadTooLargeException(
            `FREEHAND object '${obj.id}' points count exceeds limit`,
          );
        }
        for (const pt of freehandData.points) {
          if (
            !Array.isArray(pt) ||
            pt.length < 2 ||
            !Number.isFinite(pt[0]) ||
            !Number.isFinite(pt[1])
          ) {
            throw new BadRequestException(
              `FREEHAND object '${obj.id}' contains invalid point tuple`,
            );
          }
        }
      }
    }

    // 4. Connection unique IDs and referential integrity
    const connectionIds = new Set<string>();
    for (const conn of connections) {
      if (!conn.id || typeof conn.id !== 'string' || conn.id.trim() === '') {
        throw new BadRequestException('Connection ID must be a non-empty string');
      }
      if (connectionIds.has(conn.id)) {
        throw new UnprocessableEntityException(
          `Duplicate connection ID '${conn.id}' in canvas payload`,
        );
      }
      connectionIds.add(conn.id);

      if (!objectIds.has(conn.sourceObjectId)) {
        throw new UnprocessableEntityException(
          `Connection '${conn.id}' references missing source object '${conn.sourceObjectId}'`,
        );
      }
      if (!objectIds.has(conn.targetObjectId)) {
        throw new UnprocessableEntityException(
          `Connection '${conn.id}' references missing target object '${conn.targetObjectId}'`,
        );
      }
    }

    // 5. Assets validation & Image object referential integrity
    const assetKeys = new Set<string>();
    let totalDecodedBytes = 0;

    for (const [key, asset] of assetEntries) {
      if (!asset || typeof asset !== 'object') {
        throw new BadRequestException(`Asset key '${key}' is invalid`);
      }
      if (asset.id !== key) {
        throw new UnprocessableEntityException(
          `Asset record key '${key}' does not match asset id '${asset.id}'`,
        );
      }
      if (assetKeys.has(asset.id)) {
        throw new UnprocessableEntityException(
          `Duplicate asset ID '${asset.id}'`,
        );
      }
      assetKeys.add(asset.id);

      const mimeType = asset.mimeType;
      if (mimeType !== 'image/png' && mimeType !== 'image/webp') {
        throw new BadRequestException(
          `Unsupported image asset MIME type '${mimeType}' for asset '${asset.id}'`,
        );
      }

      // Validate data URL structure and header MIME match
      const dataUrl = asset.dataUrl;
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
        throw new BadRequestException(
          `Invalid data URL for image asset '${asset.id}'`,
        );
      }

      const matches = dataUrl.match(/^data:(image\/[a-zA-Z0-9+\-]+);base64,(.+)$/);
      if (!matches) {
        throw new BadRequestException(
          `Malformed base64 data URL for image asset '${asset.id}'`,
        );
      }

      const headerMime = matches[1];
      if (headerMime !== mimeType) {
        throw new BadRequestException(
          `Header MIME type '${headerMime}' does not match asset mimeType '${mimeType}'`,
        );
      }

      // Decode base64 buffer and validate limits + magic bytes
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      const decodedSize = buffer.length;

      if (decodedSize > MINI_WORKSHOP_LIMITS.MAX_ASSET_DECODED_BYTES) {
        throw new PayloadTooLargeException(
          `Decoded size for asset '${asset.id}' exceeds single asset limit of 5 MB`,
        );
      }

      totalDecodedBytes += decodedSize;
      if (totalDecodedBytes > MINI_WORKSHOP_LIMITS.MAX_TOTAL_DECODED_BYTES) {
        throw new PayloadTooLargeException(
          `Total decoded image assets size exceeds limit of 20 MB`,
        );
      }

      // Check magic bytes header
      this.validateImageMagicBytes(buffer, mimeType, asset.id);
    }

    // Verify all IMAGE objects point to a valid asset in scene.assets
    for (const obj of objects) {
      if (obj.type === MiniObjectType.IMAGE) {
        const imageData = obj.data as MiniImageDataDto;
        if (!imageData || !imageData.assetId) {
          throw new BadRequestException(
            `IMAGE object '${obj.id}' is missing assetId in data`,
          );
        }
        if (!assetKeys.has(imageData.assetId)) {
          throw new UnprocessableEntityException(
            `IMAGE object '${obj.id}' references missing asset '${imageData.assetId}'`,
          );
        }
      }
    }
  }

  private validateImageMagicBytes(
    buffer: Buffer,
    mimeType: string,
    assetId: string,
  ): void {
    if (buffer.length < 8) {
      throw new BadRequestException(
        `Asset '${assetId}' image buffer is too small to be a valid image`,
      );
    }

    if (mimeType === 'image/png') {
      // PNG magic bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
      const isPng =
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47;
      if (!isPng) {
        throw new BadRequestException(
          `Asset '${assetId}' content does not match PNG signature`,
        );
      }
    } else if (mimeType === 'image/webp') {
      // WebP magic bytes: RIFF...WEBP (bytes 0-3 = "RIFF", bytes 8-11 = "WEBP")
      const isRiff =
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46;
      const isWebp =
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50;
      if (!isRiff || !isWebp) {
        throw new BadRequestException(
          `Asset '${assetId}' content does not match WebP signature`,
        );
      }
    }
  }
}
