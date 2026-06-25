import { CanvasObject } from '../entities/canvas-object.entity';
import { CanvasObjectResponseDto } from '../dtos/object/canvas-object-response.dto';

export function toCanvasObjectResponse(
  object: CanvasObject,
): CanvasObjectResponseDto {
  return {
    id: object.id,
    canvasId: object.canvasId,
    taskId: object.taskId,
    task: object.task
      ? {
          id: object.task.id,
          title: object.task.title,
          status: object.task.status,
          priority: object.task.priority,
          deadline: object.task.deadline,
        }
      : null,
    type: object.type,
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height,
    zIndex: object.zIndex,
    data: object.data,
    createdAt: object.createdAt,
    updatedAt: object.updatedAt,
  };
}

export function toCanvasObjectResponseList(
  objects: CanvasObject[],
): CanvasObjectResponseDto[] {
  return objects.map(toCanvasObjectResponse);
}
