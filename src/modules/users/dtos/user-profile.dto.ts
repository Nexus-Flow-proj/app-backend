export class UserProfileDto {
  id!: string;
  email!: string;
  firstName!: string;
  lastName!: string;
  title!: string | null;
  bio!: string | null;
  avatarUrl!: string | null;
  skills!: string[];
  createdAt!: Date;
  updatedAt!: Date;
}
