import { User } from '@modules/users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { RefreshToken } from '../entities/refresh-token.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SignUpDto } from '../dtos/signup.dto';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDto } from '../dtos/login.dto';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { MailService } from '@shared/providers/mail/mail.service';
import { GoogleUserDto } from '../dtos/google-user.dto';
import { UserResponseDto } from '@modules/users/dtos/user-response.dto';
import { toUserResponse } from '@modules/users/mappers/user.mapper';

export interface GeneratedTokens {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
}

export interface AuthResponse extends GeneratedTokens {
  user: UserResponseDto;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepository: Repository<PasswordResetToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
    private dataSource: DataSource,
  ) { }

  async signUp(dto: SignUpDto, ip?: string): Promise<AuthResponse> {
    const exists = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const newUser = this.userRepository.create({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      passwordHash,
    });
    const savedUser = await this.userRepository.save(newUser);

    const tokens = await this.generateTokens(savedUser, ip);

    return {
      user: toUserResponse(savedUser),
      ...tokens,
    };
  }

  async login(dto: LoginDto, ip?: string): Promise<AuthResponse> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (user.passwordHash == null) {
      throw new UnauthorizedException(
        'Invalid credentials',
      );
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user, ip);

    return {
      user: toUserResponse(user),
      ...tokens,
    };
  }

  async googleLogin(user: User, ip?: string): Promise<GeneratedTokens> {
    return this.generateTokens(user, ip);
  }

  async logout(userId: string, rawRefreshToken: string): Promise<void> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');
    await this.refreshTokenRepository.delete({ userId, tokenHash });
  }

  async refresh(
    rawRefreshToken: string,
    ip?: string,
  ): Promise<GeneratedTokens> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');

    return this.dataSource.transaction(async (manager) => {
      const stored = await manager.findOne(RefreshToken, {
        where: { tokenHash },
        relations: { user: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!stored || stored.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      await manager.delete(RefreshToken, { tokenHash });
      return this.generateTokens(stored.user, ip, manager);
    });
  }

  async forgetPassword(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) return;

    const recentToken = await this.passwordResetTokenRepository.findOne({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });

    if (recentToken) {
      const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);
      if (recentToken.createdAt > twoMinAgo) return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(PasswordResetToken, { userId: user.id });

      await manager.save(
        PasswordResetToken,
        manager.create(PasswordResetToken, {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          usedAt: null,
        }),
      );
    });

    const frontendUrl = this.configService.get<string>('mail.frontendUrl');
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
    await this.mailService.sendPasswordReset(user.email, resetUrl);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.dataSource.transaction(async (manager) => {
      const storedToken = await manager.findOne(PasswordResetToken, {
        where: { tokenHash },
        relations: { user: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!storedToken)
        throw new UnauthorizedException('Invalid or expired token');
      if (storedToken.usedAt)
        throw new UnauthorizedException('Token already used');
      if (storedToken.expiresAt < new Date())
        throw new UnauthorizedException('Token expired');

      await manager.update(User, storedToken.userId, { passwordHash });

      await manager.update(PasswordResetToken, storedToken.id, {
        usedAt: new Date(),
      });

      await manager.delete(RefreshToken, { userId: storedToken.userId });
    });
  }

  async findOrCreateGoogleUser(dto: GoogleUserDto): Promise<User> {
    let user = await this.userRepository.findOne({
      where: { googleId: dto.googleId },
    });
    if (user) return user;

    user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (user) {
      user.googleId = dto.googleId;
      if (!user.avatarUrl && dto.avatarUrl) {
        user.avatarUrl = dto.avatarUrl;
      }
      return this.userRepository.save(user);
    }

    const newUser = this.userRepository.create({
      googleId: dto.googleId,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      avatarUrl: dto.avatarUrl ?? undefined,
    });
    return this.userRepository.save(newUser);
  }

  async getMe(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return toUserResponse(user);
  }

  private async generateTokens(
    user: User,
    ip?: string,
    manager?: EntityManager,
  ): Promise<GeneratedTokens> {
    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET'),
      expiresIn: '15m',
    });

    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');

    const refreshTokenRepository = manager
      ? manager.getRepository(RefreshToken)
      : this.refreshTokenRepository;

    await refreshTokenRepository.save(
      refreshTokenRepository.create({
        userId: user.id,
        tokenHash,
        ipAddress: ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }),
    );

    const csrfToken = crypto.randomBytes(32).toString('hex');

    return { accessToken, refreshToken: rawRefreshToken, csrfToken };
  }
}
