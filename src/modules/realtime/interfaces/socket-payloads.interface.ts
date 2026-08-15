import { ApiNotification } from '@modules/notifications/interfaces/api-notification.interface';

export interface ApiUserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface ApiBoardColumn {
  id: string;
  name: string;
  sortOrder: number;
  isProtected: boolean;
  color: string | null;
  createdAt: Date;
}

export interface ApiTaskSummary {
  id: string;
  title: string;
  projectId: string;
  columnOrder: number;
  status: string;
  priority: string;
  boardColumn: ApiBoardColumn;
  createdBy: ApiUserSummary;
  created_at: Date;
  updated_at: Date;
  assignee: ApiUserSummary | null;
  dependencies: { id: string; title: string }[];
  commentsCount: number;
  subtasksCount: number;
  attachmentsCount: number;
  completedSubtasksCount: number;
  source: string;
  label: string | null;
  description: string | null;
  deadline: Date | null;
  type: string;
}

export interface ApiComment {
  id: string;
  body: string;
  user: ApiUserSummary;
  created_at: string;
  updated_at?: string;
}

export interface PresencePayload {
  userId: string;
}

export interface NotificationNewPayload {
  notification: ApiNotification;
}

export interface ApiSubtask {
  id: string;
  title: string;
  isCompleted: boolean;
  sortOrder: number;
  created_at: string;
  updated_at: string;
}

export interface ColumnCreatedPayload {
  projectId: string;
  column: ApiBoardColumn;
}

export interface ColumnUpdatedPayload {
  projectId: string;
  column: ApiBoardColumn;
}

export interface ColumnDeletedPayload {
  projectId: string;
  columnId: string;
}

export interface ColumnReorderedPayload {
  projectId: string;
  columns: {
    id: string;
    sortOrder: number;
  }[];
}

export interface TaskCreatedPayload {
  projectId: string;
  task: ApiTaskSummary;
}

export interface TaskUpdatedPayload {
  projectId: string;
  task: Partial<ApiTaskSummary>;
}

export interface TaskDeletedPayload {
  projectId: string;
  taskId: string;
}

export interface CommentCreatedPayload {
  projectId: string;
  taskId: string;
  comment: ApiComment;
}

export interface CommentUpdatedPayload {
  projectId: string;
  taskId: string;
  comment: ApiComment;
}

export interface CommentDeletedPayload {
  projectId: string;
  taskId: string;
  commentId: string;
}

export interface SubtaskCreatedPayload {
  projectId: string;
  taskId: string;
  subtask: ApiSubtask;
}

export interface SubtaskUpdatedPayload {
  projectId: string;
  taskId: string;
  subtask: ApiSubtask;
}

export interface SubtaskDeletedPayload {
  projectId: string;
  taskId: string;
  subtaskId: string;
}
