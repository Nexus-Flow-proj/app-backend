import { User } from '@modules/users/entities/user.entity';
import { UserProfileDto } from '../dtos/user-profile.dto';

export function toUserProfileResponse(user: User): UserProfileDto {
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
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
