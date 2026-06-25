import { CanvasConnection } from '../entities/canvas-connection.entity';
import { CanvasConnectionResponseDto } from './../dtos/connections/canvas-connection.response.dto';

export function toCanvasConnectionResponse(
  connection: CanvasConnection,
): CanvasConnectionResponseDto {
  return {
    id: connection.id,
    canvasId: connection.canvasId,
    sourceObjectId: connection.sourceObjectId,
    targetObjectId: connection.targetObjectId,
    type: connection.type,
    data: connection.data,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
  };
}

export function toCanvasConnectionResponseList(
  connections: CanvasConnection[],
): CanvasConnectionResponseDto[] {
  return connections.map(toCanvasConnectionResponse);
}