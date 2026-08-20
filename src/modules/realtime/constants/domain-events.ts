export const DOMAIN_EVENTS = {
  SUBTASK: {
    CREATED: 'subtask.created',
    UPDATED: 'subtask.updated',
    DELETED: 'subtask.deleted',
  },
  COMMENT: {
    CREATED: 'comment.created',
    UPDATED: 'comment.updated',
    DELETED: 'comment.deleted',
  },
  COLUMN: {
    CREATED: 'column.created',
    UPDATED: 'column.updated',
    DELETED: 'column.deleted',
    REORDERED: 'column.reordered',
  },
  TASK: {
    CREATED: 'task.created',
    UPDATED: 'task.updated',
    DELETED: 'task.deleted',
  },
  CHAT: {
    MESSAGE_CREATED: 'chat.message.created',
    MESSAGE_UPDATED: 'chat.message.updated',
    MESSAGE_DELETED: 'chat.message.deleted',
    MESSAGE_PINNED: 'chat.message.pinned',
    MESSAGE_UNPINNED: 'chat.message.unpinned',
    REACTION_ADDED: 'chat.reaction.added',
    REACTION_REMOVED: 'chat.reaction.removed',
    READ: 'chat.read',
  },
} as const;
