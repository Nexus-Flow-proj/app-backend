import { Canvas } from '../entities/canvas.entity';
import { toUserResponse } from '@modules/users/mappers/user.mapper';
import { CanvasResponseDto } from './../dtos/canvas/canvas-response.dto';
 
export function toCanvasResponse(canvas: Canvas): CanvasResponseDto {
  return {
    id: canvas.id,
    projectId: canvas.projectId,
    owner: toUserResponse(canvas.owner),
    type: canvas.type,
    name: canvas.name,
    description: canvas.description,
    viewportX: canvas.viewportX,
    viewportY: canvas.viewportY,
    viewportZoom: canvas.viewportZoom,
    settings: canvas.settings,
    createdAt: canvas.createdAt,
    updatedAt: canvas.updatedAt,
  }
}