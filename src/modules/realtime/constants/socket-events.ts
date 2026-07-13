export const SOCKET_EVENTS = {
  PROJECT: {
    JOIN: 'project:join',
    LEAVE: 'project:leave',
  },

  SUBTASK: {
    CREATED: 'subtask:created',
    UPDATED: 'subtask:updated',
    DELETED: 'subtask:deleted',
  },

  COMMENT: {
    CREATED: 'comment:created',
    UPDATED: 'comment:updated',
    DELETED: 'comment:deleted',
  },

  COLUMN: {
    CREATED: 'column:created',
    UPDATED: 'column:updated',
    DELETED: 'column:deleted',
    REORDERED: 'column:reordered',
  },

  TASK: {
    CREATED: 'task:created',
    UPDATED: 'task:updated',
    DELETED: 'task:deleted'
  },
} as const;
