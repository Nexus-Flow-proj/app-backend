import { TaskStatus } from "@modules/tasks/enums/task-status.enum";
import { TaskPriority } from "@modules/tasks/enums/task-priority.enum";

export class CanvasObjectTaskSummaryDto {
  id!: string;
  title!: string;
  status!: TaskStatus;
  priority!: TaskPriority;
  deadline!: Date | null;
}