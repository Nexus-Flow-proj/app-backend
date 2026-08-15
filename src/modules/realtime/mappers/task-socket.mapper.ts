import { Task } from '@modules/tasks/entities/task.entity';
import { ApiTaskSummary } from '../interfaces/socket-payloads.interface';

export function mapTaskToApiTaskSummary(task: Task): ApiTaskSummary {
  return {
    id: task.id,
    title: task.title,
    projectId: task.project?.id ?? '',
    columnOrder: task.columnOrder,
    status: task.status,
    priority: task.priority,

    boardColumn: task.boardColumn
      ? {
          id: task.boardColumn.id,
          name: task.boardColumn.name,
          sortOrder: task.boardColumn.sortOrder,
          isProtected: task.boardColumn.isProtected,
          color: task.boardColumn.color ?? null,
          createdAt: task.boardColumn.createdAt,
        }
      : ({
          id: '',
          name: '',
          sortOrder: 0,
          isProtected: false,
          color: null,
          createdAt: new Date(),
        } as any),

    createdBy: task.createdBy
      ? {
          id: task.createdBy.id,
          email: task.createdBy.email,
          firstName: task.createdBy.firstName,
          lastName: task.createdBy.lastName,
          avatarUrl: task.createdBy.avatarUrl ?? null,
        }
      : ({
          id: '',
          email: '',
          firstName: '',
          lastName: '',
          avatarUrl: null,
        } as any),

    assignee: task.assignee
      ? {
          id: task.assignee.id,
          email: task.assignee.email,
          firstName: task.assignee.firstName,
          lastName: task.assignee.lastName,
          avatarUrl: task.assignee.avatarUrl ?? null,
        }
      : null,

    dependencies:
      task.dependencies?.map((dep) => ({
        id: dep.id,
        title: dep.title,
      })) ?? [],

    commentsCount: task.comments?.length ?? 0,
    subtasksCount: task.subtasks?.length ?? 0,
    attachmentsCount: task.attachments?.length ?? 0,
    completedSubtasksCount:
      task.subtasks?.filter((subtask) => subtask.isCompleted).length ?? 0,

    source: task.source,
    label: task.label ?? null,
    description: task.description ?? null,
    deadline: task.deadline ?? null,
    type: task.type,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  };
}