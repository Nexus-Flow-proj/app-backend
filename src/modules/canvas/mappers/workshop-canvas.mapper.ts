import { Workshop } from '../entities/workshop.entity';
import { WorkshopConnection } from '../entities/workshop-connection.entity';
import { WorkshopObject } from '../entities/workshop-object.entity';
import { WorkshopCanvasResponseDto } from '../dtos/workshop/workshop-canvas-response.dto';
import { WorkshopCanvasObjectDto } from '../dtos/workshop/workshop-canvas-object.dto';
import { WorkshopCanvasConnectionDto } from '../dtos/workshop/workshop-canvas-connection.dto';
import { FeatureDataDto } from '../dtos/workshop/feature-data.dto';
import { TaskDataDto } from '../dtos/workshop/task-data.dto';
import { StickyNoteDataDto } from '../dtos/workshop/sticky-note-data.dto';
import { CanvasObjectType } from '../enums/canvas-object-type.enum';

export function toWorkshopCanvasResponse(
  workshop: Workshop,
): WorkshopCanvasResponseDto {
  return {
    id: workshop.id,
    draftId: workshop.draftId,
    objects: (workshop.objects ?? []).map(toWorkshopCanvasObjectResponse),
    connections: (workshop.connections ?? []).map(
      toWorkshopCanvasConnectionResponse,
    ),
    viewport: {
      x: workshop.viewportX,
      y: workshop.viewportY,
      scale: workshop.viewportZoom,
    },
    createdAt: workshop.createdAt,
    updatedAt: workshop.updatedAt,
  };
}

export function toWorkshopCanvasObjectResponse(
  object: WorkshopObject,
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
  connection: WorkshopConnection,
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
  object: WorkshopObject,
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
        priority: String(
          (object.data as { priority?: string } | null)?.priority ?? 'MEDIUM',
        ),
        status: String(
          (object.data as { status?: string } | null)?.status ?? 'TODO',
        ),
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
