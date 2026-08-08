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
import { UserProfileDto } from './dtos/user-profile.dto';
import { toUserProfileResponse } from './mappers/userProfile.mapper';

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

    if (user.avatarUrl) {
      await this.storageService.deleteAvatar(user.avatarUrl);
    }

    const avatarUrl = await this.storageService.uploadAvatar(
      user.id,
      file.buffer,
      file.mimetype,
      file.originalname,
    );

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

  async getUserById(userId: string): Promise<UserProfileDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { skills: true },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return toUserProfileResponse(user);
  }

  async updateMe(userId: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { skills: true },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

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

    if (dto.skills !== undefined) {
      const skillNames = dto.skills
        .map((name) => name.trim())
        .filter((name) => name.length > 0);

      await this.skillRepository.delete({ user: { id: userId } });

      user.skills = skillNames.map((name) =>
        this.skillRepository.create({ name }),
      );
    }

    await this.userRepository.save(user);

    return this.getMe(userId);
  }
}
