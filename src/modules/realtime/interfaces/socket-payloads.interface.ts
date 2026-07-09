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