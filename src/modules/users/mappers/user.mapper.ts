import { User } from '@modules/users/entities/user.entity';
import { UserResponseDto } from '../dtos/user-response.dto';

export function toUserResponse(user: User): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    title: user.title ?? null,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl ?? null,
    skills: user.skills
      ? user.skills.map((s) => (typeof s === 'string' ? s : s.name))
      : [],
    projectMemberships: user.projectMemberships
      ? user.projectMemberships.map((pm) => ({
          id: pm.id,
          projectId: pm.project?.id,
          projectName: pm.project?.name,
          role: pm.role?.name,
          joinedAt: pm.joinedAt,
        }))
      : [],
    ownedProjects: user.ownedProjects
      ? user.ownedProjects.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description ?? null,
          status: p.status,
          color: p.color,
          createdAt: p.created_at,
        }))
      : [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
