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
    DELETED: 'task:deleted',
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

  CHAT: {
    MESSAGE_CREATED: 'chat:message:created',
    MESSAGE_UPDATED: 'chat:message:updated',
    MESSAGE_DELETED: 'chat:message:deleted',
    MESSAGE_PINNED: 'chat:message:pinned',
    MESSAGE_UNPINNED: 'chat:message:unpinned',
    REACTION_ADDED: 'chat:reaction:added',
    REACTION_REMOVED: 'chat:reaction:removed',
    TYPING: 'chat:typing',
    USER_TYPING: 'chat:user:typing',
    READ: 'chat:read',
  },
} as const;
