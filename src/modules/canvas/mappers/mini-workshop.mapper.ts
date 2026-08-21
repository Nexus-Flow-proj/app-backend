import { MiniWorkshop } from '../entities/mini-workshop.entity';
import { MiniWorkshopResponseDto } from '../dtos/mini-workshop/mini-workshop-response.dto';

export function toMiniWorkshopResponse(
  workshop: MiniWorkshop,
): MiniWorkshopResponseDto {
  const scene = (workshop.scene as any) || {};

  return {
    id: workshop.id,
    projectId: workshop.projectId,
    ownerId: workshop.ownerId,
    schemaVersion: 2,
    revision: workshop.revision,
    scene: {
      viewport: scene.viewport || { x: 40, y: 40, scale: 0.82 },
      objects: Array.isArray(scene.objects) ? scene.objects : [],
      connections: Array.isArray(scene.connections) ? scene.connections : [],
      assets:
        scene.assets && typeof scene.assets === 'object' ? scene.assets : {},
    },
    createdAt: workshop.createdAt ? workshop.createdAt.toISOString() : null,
    updatedAt: workshop.updatedAt ? workshop.updatedAt.toISOString() : null,
  };
}

export function createEmptyMiniWorkshopResponse(
  projectId: string,
  ownerId: string,
): MiniWorkshopResponseDto {
  return {
    id: null,
    projectId,
    ownerId,
    schemaVersion: 2,
    revision: 0,
    scene: {
      viewport: { x: 24, y: 24, scale: 0.82 },
      objects: [],
      connections: [],
      assets: {},
    },
    createdAt: null,
    updatedAt: null,
  };
}
