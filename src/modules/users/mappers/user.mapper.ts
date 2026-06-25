import { User } from '@modules/users/entities/user.entity';
import { UserResponseDto } from '../dtos/user-response.dto';

export function toUserResponse(user: User): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}
