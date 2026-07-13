import { SubTask } from '@modules/tasks/entities/subtask.entity';
import { ApiSubtask } from '../interfaces/socket-payloads.interface';

export function mapSubtaskToApiSubtask(subtask: SubTask): ApiSubtask {
  return {
    id: subtask.id,
    title: subtask.title,
    isCompleted: subtask.isCompleted,
    sortOrder: subtask.sortOrder,
    created_at: subtask.createdAt.toISOString(),
    updated_at: subtask.updatedAt.toISOString(),
  };
}
