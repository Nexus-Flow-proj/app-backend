import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Skill } from './entities/skill.entity';
import { StorageService } from '@shared/providers/storage/storage.service';
import { UpdateUserDto } from './dtos/update-user.dto';
import { toUserResponse } from './mappers/user.mapper';
import { UserResponseDto } from './dtos/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
    private readonly storageService: StorageService,
    private readonly dataSource: DataSource,
  ) {}

  async updateAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{
    avatarUrl: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    updatedAt: Date;
  }> {
    if (!file) {
      throw new BadRequestException('No image file provided.');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // Delete old avatar if present
    if (user.avatarUrl) {
      await this.storageService.deleteAvatar(user.avatarUrl);
    }

    // Upload new avatar to Supabase
    const avatarUrl = await this.storageService.uploadAvatar(
      user.id,
      file.buffer,
      file.mimetype,
      file.originalname,
    );

    // Save updated avatar URL
    user.avatarUrl = avatarUrl;
    const savedUser = await this.userRepository.save(user);

    return {
      avatarUrl,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      updatedAt: savedUser.updatedAt,
    };
  }

  async getMe(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: {
        skills: true,
        projectMemberships: {
          project: true,
          role: true,
        },
        ownedProjects: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return toUserResponse(user);
  }

  async updateMe(userId: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { skills: true },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // If email is being changed, check for uniqueness
    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepository.findOne({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Email already in use.');
      }
      user.email = dto.email;
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.title !== undefined) user.title = dto.title;
    if (dto.bio !== undefined) user.bio = dto.bio;
    if (dto.avatar !== undefined) user.avatarUrl = dto.avatar;

    // Handle skills: replace all existing skills with the new list
    if (dto.skills !== undefined) {
      const skillNames = dto.skills;

      await this.dataSource.transaction(async (manager) => {
        // Delete old skills
        await manager.delete(Skill, { user: { id: userId } });

        // Create new skills
        const newSkills = skillNames
          .map((name) => name.trim())
          .filter((name) => name.length > 0)
          .map((name) => manager.create(Skill, { name, user }));

        if (newSkills.length > 0) {
          await manager.save(Skill, newSkills);
        }
      });
    }

    await this.userRepository.save(user);

    // Reload full profile with relations for response
    return this.getMe(userId);
  }
}
