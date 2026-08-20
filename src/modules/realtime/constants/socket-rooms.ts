export const SOCKET_ROOMS = {
  user: (userId: string) => `user:${userId}`,
  project: (projectId: string) => `project:${projectId}`,
} as const;
