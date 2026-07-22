export const SOCKET_EVENTS = {
  PROJECT: {
    JOIN: 'project:join',
    LEAVE: 'project:leave',
  },

  NOTIFICATION: {
    NEW: 'notification:new',
  },

  PRESENCE: {
    USER_ONLINE: 'presence:user-online',
    USER_OFFLINE: 'presence:user-offline',
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

  AI_GENERATION: {
    CREATED: 'ai.generation.created',
    STARTED: 'ai.generation.started',
    PROGRESS: 'ai.generation.progress',
    COMPLETED: 'ai.generation.completed',
    FAILED: 'ai.generation.failed',
  },

  AI_CHAT: {
    STARTED: 'ai.chat.started',
    PROGRESS: 'ai.chat.progress',
    COMPLETED: 'ai.chat.completed',
    FAILED: 'ai.chat.failed',
  },
} as const;
