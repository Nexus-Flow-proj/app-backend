import {
  Controller,
  Post,
  Patch,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CsrfGuard } from '@shared/guards/csrf.guard';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import {
  avatarFileFilter,
  MAX_AVATAR_SIZE_BYTES,
} from '@shared/utils/file-validation.util';
import { UpdateUserDto } from './dtos/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── GET /users/me ─────────────────────────────────────
  @Get('me')
  async getMe(@CurrentUser() user: User) {
    const data = await this.usersService.getMe(user.id);
    return {
      message: 'Profile retrieved successfully.',
      data,
    };
  }

  // ─── GET /users/:userId ───────────────────────────────────
  @Get(':userId')
  async getUserById(@Param('userId') userId: string) {
    const data = await this.usersService.getUserById(userId);
    return {
      message: 'User profile loaded successfully',
      data,
    };
  }

  // ─── PATCH /users/me ───────────────────────────────────
  @Patch('me')
  @UseGuards(CsrfGuard)
  async updateMe(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    const data = await this.usersService.updateMe(user.id, dto);
    return {
      message: 'Profile updated successfully.',
      data,
    };
  }

  // ─── POST /users/me/avatar ─────────────────────────────
  @Post('me/avatar')
  @UseGuards(CsrfGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_AVATAR_SIZE_BYTES },
      fileFilter: avatarFileFilter,
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Please provide a file with field name "file".',
      );
    }

    const data = await this.usersService.updateAvatar(user.id, file);
    return {
      message: 'Avatar updated successfully.',
      data,
    };
  }
}
