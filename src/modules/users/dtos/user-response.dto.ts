export class UserResponseDto {
  id!: string;
  email!: string;
  firstName!: string;
  lastName!: string;
  title!: string | null;
  bio!: string | null;
  avatarUrl!: string | null;
  skills!: string[];
  projectMemberships!: Array<{
    id: string;
    projectId?: string;
    projectName?: string;
    role?: string;
    joinedAt?: Date;
  }>;
  ownedProjects!: Array<{
    id: string;
    name: string;
    description: string | null;
    status: string;
    color: string;
    createdAt: Date;
  }>;
  createdAt!: Date;
  updatedAt!: Date;
}
