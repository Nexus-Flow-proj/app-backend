export class TaskDataDto {
  taskId?: string;
  featureId!: string;
  kind!: 'Task';
  title!: string;
  description?: string;
  dueDate?: string;
  priority?: string;
}
