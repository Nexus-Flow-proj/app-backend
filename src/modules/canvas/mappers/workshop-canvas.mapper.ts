import { Canvas } from '../entities/canvas.entity';
import { CanvasConnection } from '../entities/canvas-connection.entity';
import { CanvasObject } from '../entities/canvas-object.entity';
import { toUserResponse } from '@modules/users/mappers/user.mapper';
import { WorkshopCanvasResponseDto } from '../dtos/workshop/workshop-canvas-response.dto';
import { WorkshopCanvasObjectDto } from '../dtos/workshop/workshop-canvas-object.dto';
import { WorkshopCanvasConnectionDto } from '../dtos/workshop/workshop-canvas-connection.dto';
import { FeatureDataDto } from '../dtos/workshop/feature-data.dto';
import { TaskDataDto } from '../dtos/workshop/task-data.dto';
import { StickyNoteDataDto } from '../dtos/workshop/sticky-note-data.dto';
import { CanvasObjectType } from '../enums/canvas-object-type.enum';

export function toWorkshopCanvasResponse(
  canvas: Canvas,
): WorkshopCanvasResponseDto {
  const canvasWithRelations = canvas as Canvas & {
    objects?: CanvasObject[];
    connections?: CanvasConnection[];
  };

  return {
    id: canvas.id,
    projectId: canvas.projectId,
    owner: toUserResponse(canvas.owner),
    type: 'PROJECT',
    objects: (canvasWithRelations.objects ?? []).map(
      toWorkshopCanvasObjectResponse,
    ),
    connections: (canvasWithRelations.connections ?? []).map(
      toWorkshopCanvasConnectionResponse,
    ),
    viewport: {
      x: canvas.viewportX,
      y: canvas.viewportY,
      scale: canvas.viewportZoom,
    },
    createdAt: canvas.createdAt,
    updatedAt: canvas.updatedAt,
  };
}

export function toWorkshopCanvasObjectResponse(
  object: CanvasObject,
): WorkshopCanvasObjectDto {
  return {
    id: object.id,
    type: object.type as
      | CanvasObjectType.SECTION_FRAME
      | CanvasObjectType.TASK_CARD
      | CanvasObjectType.STICKY_NOTE,
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height,
    rotation: object.rotation,
    zIndex: object.zIndex,
    data: toWorkshopCanvasObjectData(object),
  };
}

export function toWorkshopCanvasConnectionResponse(
  connection: CanvasConnection,
): WorkshopCanvasConnectionDto {
  return {
    id: connection.id,
    fromObjectId: connection.sourceObjectId,
    toObjectId: connection.targetObjectId,
    label:
      connection.data && typeof connection.data === 'object'
        ? (connection.data as { label?: string }).label
        : undefined,
    style: {
      color: readConnectionStyleColor(connection.data),
      strokeWidth: readConnectionStyleStrokeWidth(connection.data),
      type: connection.type,
    },
  };
}

function toWorkshopCanvasObjectData(
  object: CanvasObject,
): FeatureDataDto | TaskDataDto | StickyNoteDataDto {
  switch (object.type) {
    case CanvasObjectType.SECTION_FRAME:
      return {
        kind: 'Feature',
        title: String((object.data as { title?: string } | null)?.title ?? ''),
        description: (object.data as { description?: string } | null)
          ?.description,
        backgroundColor: String(
          (object.data as { backgroundColor?: string } | null)
            ?.backgroundColor ?? '',
        ),
        borderColor: String(
          (object.data as { borderColor?: string } | null)?.borderColor ?? '',
        ),
        boardColumnId: object.boardColumnId ?? undefined,
      };
    case CanvasObjectType.TASK_CARD:
      return {
        kind: 'Task',
        title: String((object.data as { title?: string } | null)?.title ?? ''),
        description: (object.data as { description?: string } | null)
          ?.description,
        dueDate: (object.data as { dueDate?: string } | null)?.dueDate,
        featureId: String(
          (object.data as { featureId?: string } | null)?.featureId ?? '',
        ),
        taskId: object.taskId ?? undefined,
      };
    case CanvasObjectType.STICKY_NOTE:
    default:
      return {
        kind: 'Note',
        content: String(
          (object.data as { content?: string } | null)?.content ?? '',
        ),
        color: String((object.data as { color?: string } | null)?.color ?? ''),
        fontSize: Number(
          (object.data as { fontSize?: number } | null)?.fontSize ?? 0,
        ),
      };
  }
}

function readConnectionStyleColor(
  data: Record<string, unknown> | null,
): string {
  if (!data || typeof data !== 'object') {
    return '#000000';
  }

  const nestedStyle = data.style;
  if (nestedStyle && typeof nestedStyle === 'object') {
    const color = (nestedStyle as { color?: unknown }).color;
    if (typeof color === 'string' && color.length > 0) {
      return color;
    }
  }

  const flatColor = (data as { color?: unknown }).color;
  return typeof flatColor === 'string' && flatColor.length > 0
    ? flatColor
    : '#000000';
}

function readConnectionStyleStrokeWidth(
  data: Record<string, unknown> | null,
): number {
  if (!data || typeof data !== 'object') {
    return 1;
  }

  const nestedStyle = data.style;
  if (nestedStyle && typeof nestedStyle === 'object') {
    const strokeWidth = (nestedStyle as { strokeWidth?: unknown }).strokeWidth;
    if (typeof strokeWidth === 'number' && Number.isFinite(strokeWidth)) {
      return strokeWidth;
    }
  }

  const flatStrokeWidth = (data as { strokeWidth?: unknown }).strokeWidth;
  return typeof flatStrokeWidth === 'number' && Number.isFinite(flatStrokeWidth)
    ? flatStrokeWidth
    : 1;
}
