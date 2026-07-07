export const SOCKET_EVENTS = {
  PROJECT: {
    JOIN: 'project:join',
    LEAVE: 'project:leave',
  },

  TASK: {
    CREATED: 'task:created',
    UPDATED: 'task:updated',
  },
} as const;