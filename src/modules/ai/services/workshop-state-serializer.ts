import { WorkshopObject } from '@modules/canvas/entities/workshop-object.entity';
import { WorkshopConnection } from '@modules/canvas/entities/workshop-connection.entity';
import { CanvasObjectType } from '@modules/canvas/enums/canvas-object-type.enum';

export class WorkshopStateSerializer {
  static serialize(
    objects: WorkshopObject[],
    connections: WorkshopConnection[],
  ): Record<string, unknown> {
    const sectionFrames = objects.filter(
      (obj) => obj.type === CanvasObjectType.SECTION_FRAME,
    );
    const taskCards = objects.filter(
      (obj) => obj.type === CanvasObjectType.TASK_CARD,
    );
    const stickyNotes = objects.filter(
      (obj) => obj.type === CanvasObjectType.STICKY_NOTE,
    );

    const frameById = new Map<string, WorkshopObject>();
    sectionFrames.forEach((frame) => frameById.set(frame.id, frame));

    const features = sectionFrames.map((frame) => {
      const data = (frame.data ?? {}) as Record<string, any>;
      const childTasks = taskCards
        .filter((task) => {
          const taskData = (task.data ?? {}) as Record<string, any>;
          return taskData.featureId === frame.id;
        })
        .map((task) => {
          const taskData = (task.data ?? {}) as Record<string, any>;
          return {
            id: task.id,
            title: taskData.title || 'Untitled Task',
            description: taskData.description || '',
            priority: taskData.priority || 'MEDIUM',
            dueDate: taskData.dueDate || null,
          };
        });

      return {
        id: frame.id,
        title: data.title || 'Untitled Feature',
        description: data.description || '',
        tasks: childTasks,
      };
    });

    const unassignedTasks = taskCards
      .filter((task) => {
        const taskData = (task.data ?? {}) as Record<string, any>;
        return !taskData.featureId || !frameById.has(taskData.featureId);
      })
      .map((task) => {
        const taskData = (task.data ?? {}) as Record<string, any>;
        return {
          id: task.id,
          title: taskData.title || 'Untitled Task',
          description: taskData.description || '',
          priority: taskData.priority || 'MEDIUM',
          dueDate: taskData.dueDate || null,
        };
      });

    const notes = stickyNotes.map((note) => {
      const data = (note.data ?? {}) as Record<string, any>;
      return {
        id: note.id,
        content: data.content || '',
        color: data.color || null,
      };
    });

    const serializedConnections = connections.map((conn) => {
      const data = (conn.data ?? {}) as Record<string, any>;
      return {
        id: conn.id,
        fromObjectId: conn.sourceObjectId,
        toObjectId: conn.targetObjectId,
        type: conn.type,
        label: data.label || null,
      };
    });

    return {
      features,
      unassignedTasks,
      notes,
      connections: serializedConnections,
    };
  }
}
