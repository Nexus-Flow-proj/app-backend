import { Injectable } from '@nestjs/common';

@Injectable()
export class PresenceTrackerService {
  private readonly projectUserSockets = new Map<string, Map<string, Set<string>>>();
  private readonly socketUsers = new Map<string, string>();
  private readonly socketProjects = new Map<string, string>();
  private readonly socketProjectMembers = new Map<string, string>();

  addSocket(
    socketId: string,
    userId: string,
    projectId: string,
    projectMemberId: string,
  ): { isFirstForProject: boolean } {
    this.socketUsers.set(socketId, userId);
    this.socketProjects.set(socketId, projectId);
    this.socketProjectMembers.set(socketId, projectMemberId);

    let projectMap = this.projectUserSockets.get(projectId);
    if (!projectMap) {
      projectMap = new Map<string, Set<string>>();
      this.projectUserSockets.set(projectId, projectMap);
    }

    let socketSet = projectMap.get(userId);
    const isFirstForProject = !socketSet || socketSet.size === 0;

    if (!socketSet) {
      socketSet = new Set<string>();
      projectMap.set(userId, socketSet);
    }

    socketSet.add(socketId);

    return { isFirstForProject };
  }

  removeSocket(
    socketId: string,
    projectId?: string,
  ): {
    userId?: string;
    projectMemberId?: string;
    wasLastForProject: boolean;
  } {
    const userId = this.socketUsers.get(socketId);
    const projectMemberId = this.socketProjectMembers.get(socketId);
    const trackedProjectId = projectId ?? this.socketProjects.get(socketId);

    if (!userId || !trackedProjectId) {
      this.socketUsers.delete(socketId);
      this.socketProjects.delete(socketId);
      this.socketProjectMembers.delete(socketId);
      return { userId, projectMemberId, wasLastForProject: false };
    }

    const projectMap = this.projectUserSockets.get(trackedProjectId);
    const socketSet = projectMap?.get(userId);

    if (!socketSet || !socketSet.has(socketId)) {
      this.socketUsers.delete(socketId);
      this.socketProjects.delete(socketId);
      this.socketProjectMembers.delete(socketId);
      return { userId, projectMemberId, wasLastForProject: false };
    }

    socketSet.delete(socketId);

    const wasLastForProject = socketSet.size === 0;

    if (wasLastForProject) {
      projectMap?.delete(userId);
    }

    if (projectMap && projectMap.size === 0) {
      this.projectUserSockets.delete(trackedProjectId);
    }

    this.socketUsers.delete(socketId);
    this.socketProjects.delete(socketId);
    this.socketProjectMembers.delete(socketId);

    return { userId, projectMemberId, wasLastForProject };
  }

  isSocketTrackedInProject(socketId: string, projectId: string): boolean {
    return this.socketProjects.get(socketId) === projectId;
  }

  getActiveProjectId(socketId: string): string | undefined {
    return this.socketProjects.get(socketId);
  }

  getUserId(socketId: string): string | undefined {
    return this.socketUsers.get(socketId);
  }

  clearSocket(socketId: string): { userId?: string; projectId?: string } {
    const userId = this.socketUsers.get(socketId);
    const projectId = this.socketProjects.get(socketId);
    this.removeSocket(socketId, projectId);
    return { userId, projectId };
  }
}
