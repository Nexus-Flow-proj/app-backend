import {
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Board } from '@modules/boards/entities/board.entity';
import { Task } from '@modules/tasks/entities/task.entity';
import { SaveWorkshopCanvasDto } from '../dtos/workshop/save-workshop-canvas.dto';
import { SaveWorkshopCanvasObjectDto } from '../dtos/workshop/save-workshop-canvas-object.dto';
import { SaveWorkshopCanvasConnectionDto } from '../dtos/workshop/save-workshop-canvas-connection.dto';
import { SaveWorkshopFeatureDataDto } from '../dtos/workshop/save-workshop-feature-data.dto';
import { SaveWorkshopTaskDataDto } from '../dtos/workshop/save-workshop-task-data.dto';
import { SaveWorkshopStickyNoteDataDto } from '../dtos/workshop/save-workshop-sticky-note-data.dto';

@Injectable()
export class WorkshopCanvasValidator {
  async validateDocumentOrThrow(params: {
    dto: SaveWorkshopCanvasDto;
    projectId: string;
    manager: DataSource['manager'];
    canvasId?: string;
  }): Promise<void> {
    const { dto, projectId, manager, canvasId } = params;
    const objects = dto.objects ?? [];
    const connections = dto.connections ?? [];

    this.validateViewport(dto.viewport);
    this.validateNoDuplicateIds(objects, connections);
    this.validateTypesAndShapes(objects, connections);

    this.validateObjectKindsAndPairs(objects);
    this.validateConnectionGraph(objects, connections);

    const featureObjects = objects.filter(
      (object) => object.type === 'SECTION_FRAME',
    );
    const taskObjects = objects.filter((object) => object.type === 'TASK_CARD');

    await this.validateExternalReferences({
      projectId,
      manager,
      featureObjects,
      taskObjects,
      canvasId,
    });

    this.validateTaskContainment(taskObjects, featureObjects);
  }

  private validateNoDuplicateIds(
    objects: SaveWorkshopCanvasObjectDto[],
    connections: SaveWorkshopCanvasConnectionDto[],
  ): void {
    const objectIds = new Set<string>();
    for (const object of objects) {
      if (objectIds.has(object.id)) {
        throw new UnprocessableEntityException(
          `Duplicate object ID '${object.id}' in Workshop payload`,
        );
      }
      objectIds.add(object.id);
    }

    const connectionIds = new Set<string>();
    for (const connection of connections) {
      if (connectionIds.has(connection.id)) {
        throw new UnprocessableEntityException(
          `Duplicate connection ID '${connection.id}' in Workshop payload`,
        );
      }
      connectionIds.add(connection.id);
    }
  }

  private validateViewport(viewport: SaveWorkshopCanvasDto['viewport']): void {
    if (
      !Number.isFinite(viewport.x) ||
      !Number.isFinite(viewport.y) ||
      !Number.isFinite(viewport.scale)
    ) {
      throw new BadRequestException(
        'Workshop viewport contains non-finite numeric values',
      );
    }

    if (viewport.scale < 0.15 || viewport.scale > 3) {
      throw new BadRequestException(
        'Workshop viewport scale must be between 0.15 and 3',
      );
    }
  }

  private validateTypesAndShapes(
    objects: SaveWorkshopCanvasObjectDto[],
    connections: SaveWorkshopCanvasConnectionDto[],
  ): void {
    for (const object of objects) {
      if (
        object.type !== 'SECTION_FRAME' &&
        object.type !== 'TASK_CARD' &&
        object.type !== 'STICKY_NOTE'
      ) {
        throw new BadRequestException(
          `Unsupported Workshop canvas object type '${object.type}'`,
        );
      }

      if (
        !Number.isFinite(object.x) ||
        !Number.isFinite(object.y) ||
        !Number.isFinite(object.width) ||
        !Number.isFinite(object.height) ||
        !Number.isFinite(object.rotation) ||
        !Number.isFinite(object.zIndex)
      ) {
        throw new BadRequestException(
          `Workshop object '${object.id}' contains non-finite numeric values`,
        );
      }

      if (object.width <= 0 || object.height <= 0) {
        throw new BadRequestException(
          `Workshop object '${object.id}' must have positive width and height`,
        );
      }
    }

    for (const connection of connections) {
      if (
        !Number.isFinite(connection.style.strokeWidth) ||
        !connection.style.type ||
        (connection.style.type !== 'ARROW' &&
          connection.style.type !== 'LINE' &&
          connection.style.type !== 'DASHED')
      ) {
        throw new BadRequestException(
          `Workshop connection '${connection.id}' has invalid style values`,
        );
      }
    }
  }

  private validateObjectKindsAndPairs(
    objects: SaveWorkshopCanvasObjectDto[],
  ): void {
    for (const object of objects) {
      if (object.type === 'SECTION_FRAME' && object.data.kind !== 'Feature') {
        throw new UnprocessableEntityException(
          `Object '${object.id}' must use Feature data for SECTION_FRAME`,
        );
      }

      if (object.type === 'TASK_CARD' && object.data.kind !== 'Task') {
        throw new UnprocessableEntityException(
          `Object '${object.id}' must use Task data for TASK_CARD`,
        );
      }

      if (object.type === 'STICKY_NOTE' && object.data.kind !== 'Note') {
        throw new UnprocessableEntityException(
          `Object '${object.id}' must use Note data for STICKY_NOTE`,
        );
      }
    }
  }

  private validateConnectionGraph(
    objects: SaveWorkshopCanvasObjectDto[],
    connections: SaveWorkshopCanvasConnectionDto[],
  ): void {
    const objectTypeById = new Map(
      objects.map((object) => [object.id, object.type]),
    );
    const adjacency = new Map<string, string[]>();

    for (const object of objects) {
      adjacency.set(object.id, []);
    }

    for (const connection of connections) {
      const sourceType = objectTypeById.get(connection.fromObjectId);
      const targetType = objectTypeById.get(connection.toObjectId);

      if (!sourceType || !targetType) {
        throw new UnprocessableEntityException(
          `Connection '${connection.id}' references missing Workshop objects`,
        );
      }

      if (sourceType !== 'SECTION_FRAME' || targetType !== 'SECTION_FRAME') {
        throw new UnprocessableEntityException(
          `Connection '${connection.id}' must connect SECTION_FRAME objects only`,
        );
      }

      if (connection.fromObjectId === connection.toObjectId) {
        throw new UnprocessableEntityException(
          `Connection '${connection.id}' cannot point to itself`,
        );
      }

      const outgoing = adjacency.get(connection.fromObjectId) ?? [];
      if (outgoing.includes(connection.toObjectId)) {
        throw new UnprocessableEntityException(
          `Duplicate directed connection from '${connection.fromObjectId}' to '${connection.toObjectId}'`,
        );
      }
      outgoing.push(connection.toObjectId);
      adjacency.set(connection.fromObjectId, outgoing);
    }

    const visited = new Set<string>();
    const inStack = new Set<string>();

    const visit = (node: string): void => {
      if (inStack.has(node)) {
        throw new UnprocessableEntityException(
          'Workshop feature connection graph contains a cycle',
        );
      }

      if (visited.has(node)) {
        return;
      }

      visited.add(node);
      inStack.add(node);

      for (const next of adjacency.get(node) ?? []) {
        visit(next);
      }

      inStack.delete(node);
    };

    for (const node of adjacency.keys()) {
      visit(node);
    }
  }

  private validateTaskContainment(
    taskObjects: SaveWorkshopCanvasObjectDto[],
    featureObjects: SaveWorkshopCanvasObjectDto[],
  ): void {
    const featureMap = new Map(
      featureObjects.map((feature) => [feature.id, feature]),
    );

    for (const task of taskObjects) {
      const taskData = task.data as SaveWorkshopTaskDataDto;
      const taskTitle = taskData?.title?.trim() || 'Untitled Task';
      const featureId = taskData?.featureId?.trim();
      const feature = featureId ? featureMap.get(featureId) : undefined;
      if (!feature) {
        throw new UnprocessableEntityException(
          `Task "${taskTitle}" is not assigned to a valid feature frame. Please place it inside a feature frame.`,
        );
      }

      const featureData = feature.data as SaveWorkshopFeatureDataDto;
      const featureTitle = featureData?.title?.trim() || 'Untitled Feature';

      const left = feature.x + 24;
      const right = feature.x + feature.width - 24;
      const top = feature.y + 96;
      const bottom = feature.y + feature.height - 24;

      if (
        task.x < left ||
        task.y < top ||
        task.x + task.width > right ||
        task.y + task.height > bottom
      ) {
        throw new UnprocessableEntityException(
          `Task "${taskTitle}" must be placed completely inside the "${featureTitle}" frame.`,
        );
      }
    }
  }

  private async validateExternalReferences(params: {
    projectId: string;
    manager: DataSource['manager'];
    featureObjects: SaveWorkshopCanvasObjectDto[];
    taskObjects: SaveWorkshopCanvasObjectDto[];
    canvasId?: string;
  }): Promise<void> {
    const { projectId, manager, featureObjects, taskObjects, canvasId } =
      params;

    const boardColumnIds = Array.from(
      new Set(
        featureObjects
          .map(
            (feature) =>
              (feature.data as SaveWorkshopFeatureDataDto).boardColumnId,
          )
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const taskIds = Array.from(
      new Set(
        taskObjects
          .map((task) => (task.data as SaveWorkshopTaskDataDto).taskId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (boardColumnIds.length > 0) {
      const boardRepo = manager.getRepository(Board);
      const boardColumns = await boardRepo.find({
        where: { id: In(boardColumnIds) },
        relations: { project: true },
      });

      const boardById = new Map(boardColumns.map((board) => [board.id, board]));
      for (const boardColumnId of boardColumnIds) {
        const board = boardById.get(boardColumnId);
        if (!board || board.project.id !== projectId) {
          throw new UnprocessableEntityException(
            `Board column '${boardColumnId}' does not belong to project '${projectId}'`,
          );
        }
      }
    }

    if (taskIds.length > 0) {
      const taskRepo = manager.getRepository(Task);
      const tasks = await taskRepo.find({
        where: { id: In(taskIds) },
        relations: { project: true },
      });

      const taskById = new Map(tasks.map((task) => [task.id, task]));
      for (const taskId of taskIds) {
        const task = taskById.get(taskId);
        if (!task || task.project.id !== projectId) {
          throw new UnprocessableEntityException(
            `Task '${taskId}' does not belong to project '${projectId}'`,
          );
        }
      }
    }
  }
}
