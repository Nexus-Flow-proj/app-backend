import { TaskComment } from '@modules/tasks/entities/task-comment.entity';
import { ApiComment } from '../interfaces/socket-payloads.interface';

export function mapCommentToApiComment(comment: TaskComment): ApiComment {
  return {
    id: comment.id,
    body: comment.body,
    user: {
      id: comment.user.id,
      email: comment.user.email,
      firstName: comment.user.firstName,
      lastName: comment.user.lastName,
      avatarUrl: comment.user.avatarUrl ?? null,
    },
    created_at: comment.createdAt.toISOString(),
    updated_at: comment.updatedAt?.toISOString(),
  };
}
